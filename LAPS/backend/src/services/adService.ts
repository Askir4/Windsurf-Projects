import ActiveDirectory from 'activedirectory2';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { User, ADComputer, LAPSPassword } from '../types/index.js';

interface ADConfig {
  url: string;
  baseDN: string;
  username: string;
  password: string;
  attributes?: {
    user?: string[];
    group?: string[];
  };
}

const adConfig: ADConfig = {
  url: config.AD_URL,
  baseDN: config.AD_BASE_DN,
  username: config.AD_USERNAME,
  password: config.AD_PASSWORD,
  attributes: {
    user: ['sAMAccountName', 'displayName', 'mail', 'memberOf', 'userPrincipalName'],
    group: ['cn', 'distinguishedName', 'member'],
  },
};

let ad: ActiveDirectory | null = null;

function getAD(): ActiveDirectory {
  if (!ad) {
    ad = new ActiveDirectory(adConfig);
  }
  return ad;
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  return new Promise((resolve) => {
    const activeDir = getAD();
    
    activeDir.authenticate(username, password, (authErr, auth) => {
      if (authErr || !auth) {
        logger.warn('AD authentication failed', { username, error: authErr?.message });
        resolve(null);
        return;
      }

      activeDir.findUser(username, (findErr, user) => {
        if (findErr || !user) {
          logger.error('Failed to find authenticated user', { username, error: findErr?.message });
          resolve(null);
          return;
        }

        const userObj = user as Record<string, unknown>;
        const memberOf = (userObj.memberOf as string[] || []);
        const isAdmin = memberOf.some((group: string) => 
          group.toLowerCase().includes(config.AD_ADMIN_GROUP.toLowerCase())
        );

        resolve({
          username: userObj.sAMAccountName as string,
          displayName: (userObj.displayName as string) || (userObj.sAMAccountName as string),
          email: (userObj.mail as string) || '',
          isAdmin,
          groups: memberOf,
        });
      });
    });
  });
}

export async function getUserFromSAM(samAccountName: string): Promise<User | null> {
  return new Promise((resolve) => {
    const activeDir = getAD();
    
    activeDir.findUser(samAccountName, (err, user) => {
      if (err || !user) {
        logger.debug('User not found in AD', { samAccountName });
        resolve(null);
        return;
      }

      const userObj = user as Record<string, unknown>;
      const memberOf = (userObj.memberOf as string[] || []);
      const isAdmin = memberOf.some((group: string) => 
        group.toLowerCase().includes(config.AD_ADMIN_GROUP.toLowerCase())
      );

      resolve({
        username: userObj.sAMAccountName as string,
        displayName: (userObj.displayName as string) || (userObj.sAMAccountName as string),
        email: (userObj.mail as string) || '',
        isAdmin,
        groups: memberOf,
      });
    });
  });
}

export async function isUserAdmin(username: string): Promise<boolean> {
  return new Promise((resolve) => {
    const activeDir = getAD();
    
    activeDir.isUserMemberOf(username, config.AD_ADMIN_GROUP, (err, isMember) => {
      if (err) {
        logger.error('Failed to check admin group membership', { username, error: err.message });
        resolve(false);
        return;
      }
      resolve(Boolean(isMember));
    });
  });
}

export async function findComputer(hostname: string): Promise<ADComputer | null> {
  return new Promise((resolve) => {
    const activeDir = getAD();
    const normalizedHostname = hostname.toUpperCase().replace(/\$$/, '');
    
    const opts = {
      filter: `(&(objectClass=computer)(cn=${normalizedHostname}))`,
      attributes: ['cn', 'name', 'distinguishedName', 'operatingSystem', 'managedBy', 'description'],
    };

    activeDir.find(opts, (err, results) => {
      if (err) {
        logger.error('AD computer search failed', { hostname, error: err.message });
        resolve(null);
        return;
      }

      const other = results?.other;
      if (!other || other.length === 0) {
        logger.debug('Computer not found in AD', { hostname });
        resolve(null);
        return;
      }

      const computer = other[0] as Record<string, unknown>;
      resolve({
        dn: computer.distinguishedName as string || computer.dn as string,
        cn: computer.cn as string,
        name: computer.name as string,
        operatingSystem: computer.operatingSystem as string | undefined,
        managedBy: computer.managedBy as string | undefined,
        description: computer.description as string | undefined,
      });
    });
  });
}

export async function isUserAuthorizedForComputer(
  username: string, 
  hostname: string
): Promise<boolean> {
  const computer = await findComputer(hostname);
  if (!computer) {
    return false;
  }

  // Check if user is an admin - admins can access any computer
  const isAdmin = await isUserAdmin(username);
  if (isAdmin) {
    return true;
  }

  // Check managedBy attribute
  if (computer.managedBy) {
    const user = await getUserFromSAM(username);
    if (user) {
      // Extract CN from managedBy DN and compare
      const managedByMatch = computer.managedBy.match(/CN=([^,]+)/i);
      if (managedByMatch && managedByMatch[1].toLowerCase() === username.toLowerCase()) {
        return true;
      }
    }
  }

  // For production: implement additional authorization checks here
  // - Check if computer is in user's OU
  // - Check group-based permissions
  // - Check custom attribute mappings
  
  // Default: allow users to request for any computer (admins will review)
  // In strict mode, you would return false here
  return true;
}

export async function getLAPSPassword(hostname: string): Promise<LAPSPassword | null> {
  return new Promise((resolve) => {
    const activeDir = getAD();
    const normalizedHostname = hostname.toUpperCase().replace(/\$$/, '');
    
    // Query for LAPS attributes
    const opts = {
      filter: `(&(objectClass=computer)(cn=${normalizedHostname}))`,
      attributes: [
        config.LAPS_PASSWORD_ATTRIBUTE,
        config.LAPS_EXPIRY_ATTRIBUTE,
        // Windows LAPS attributes for future support
        config.WINDOWS_LAPS_PASSWORD_ATTRIBUTE,
        config.WINDOWS_LAPS_ENCRYPTED_PASSWORD_ATTRIBUTE,
      ],
    };

    activeDir.find(opts, (err, results) => {
      if (err) {
        logger.error('LAPS password retrieval failed', { hostname, error: err.message });
        resolve(null);
        return;
      }

      const other = results?.other;
      if (!other || other.length === 0) {
        logger.warn('Computer not found when retrieving LAPS password', { hostname });
        resolve(null);
        return;
      }

      const computer = other[0] as Record<string, unknown>;
      
      // Try classic LAPS first
      const lapsPassword = computer[config.LAPS_PASSWORD_ATTRIBUTE] as string | undefined;
      const lapsExpiry = computer[config.LAPS_EXPIRY_ATTRIBUTE] as string | undefined;
      
      if (lapsPassword) {
        let expirationTime: Date | undefined;
        if (lapsExpiry) {
          // Convert Windows FileTime to JavaScript Date
          const fileTime = BigInt(lapsExpiry);
          const epochDiff = BigInt('116444736000000000'); // Difference between Windows epoch and Unix epoch
          const unixTimeMs = Number((fileTime - epochDiff) / BigInt(10000));
          expirationTime = new Date(unixTimeMs);
        }
        
        // IMPORTANT: Do not log the password!
        logger.info('LAPS password retrieved successfully', { hostname });
        resolve({
          password: lapsPassword,
          expirationTime,
        });
        return;
      }

      // Try Windows LAPS (new)
      const windowsLapsPassword = computer[config.WINDOWS_LAPS_PASSWORD_ATTRIBUTE] as string | undefined;
      if (windowsLapsPassword) {
        // Windows LAPS stores JSON with password and other metadata
        try {
          const lapsData = JSON.parse(windowsLapsPassword);
          logger.info('Windows LAPS password retrieved successfully', { hostname });
          resolve({
            password: lapsData.p || lapsData.Password,
            expirationTime: lapsData.t ? new Date(lapsData.t) : undefined,
          });
          return;
        } catch {
          logger.error('Failed to parse Windows LAPS password JSON', { hostname });
        }
      }

      logger.warn('No LAPS password found for computer', { hostname });
      resolve(null);
    });
  });
}

export async function checkADConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    const activeDir = getAD();
    
    // Simple query to test connection
    const opts = {
      filter: '(objectClass=domain)',
      attributes: ['dc'],
      sizeLimit: 1,
    };

    activeDir.find(opts, (err) => {
      if (err) {
        logger.error('AD connection check failed', { error: err.message });
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

export function validateHostname(hostname: string): { valid: boolean; error?: string } {
  // Remove any trailing $ (computer account format)
  const normalized = hostname.replace(/\$$/, '');
  
  // Check length (NetBIOS limit is 15 characters)
  if (normalized.length === 0) {
    return { valid: false, error: 'Hostname cannot be empty' };
  }
  if (normalized.length > 15) {
    return { valid: false, error: 'Hostname cannot exceed 15 characters' };
  }
  
  // Check for valid characters (alphanumeric and hyphens only)
  if (!/^[a-zA-Z0-9-]+$/.test(normalized)) {
    return { valid: false, error: 'Hostname can only contain letters, numbers, and hyphens' };
  }
  
  // Cannot start or end with hyphen
  if (normalized.startsWith('-') || normalized.endsWith('-')) {
    return { valid: false, error: 'Hostname cannot start or end with a hyphen' };
  }
  
  return { valid: true };
}
