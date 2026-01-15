# Recipe Website for Raspberry Pi 4

A beautiful, self-hosted recipe management website designed to run on Raspberry Pi 4 with SQLite database storage.

## Features

- **Add/Edit/Delete Recipes** - Full CRUD operations for your recipes
- **Image Upload** - Add photos to your recipes
- **Search & Filter** - Find recipes by name, ingredients, or category
- **Categories** - Organize recipes (Breakfast, Lunch, Dinner, Dessert, etc.)
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Lightweight Database** - Uses SQLite (no separate database server needed)

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite3
- **Frontend**: React + Tailwind CSS
- **Icons**: Lucide React

## Installation on Raspberry Pi 4

### 1. Prerequisites

Make sure your Pi has Node.js installed:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18 LTS recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Clone/Copy the Project

Copy the project files to your Raspberry Pi:

```bash
# Create a directory for the project
mkdir -p ~/recipe-website
cd ~/recipe-website

# Copy files here (via SCP, USB, etc.)
```

### 3. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies and build
cd client
npm install
npm run build
cd ..
```

### 4. Start the Server

```bash
# Start the server
npm start
```

The server will start on port 3001. Access it at:
- From the Pi: `http://localhost:3001`
- From other devices: `http://<PI_IP_ADDRESS>:3001`

### 5. Find Your Pi's IP Address

```bash
hostname -I
```

## Running as a Service (Auto-start on Boot)

Create a systemd service to run the website automatically:

```bash
sudo nano /etc/systemd/system/recipe-website.service
```

Add the following content:

```ini
[Unit]
Description=Recipe Website
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/recipe-website
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable recipe-website
sudo systemctl start recipe-website

# Check status
sudo systemctl status recipe-website
```

## Configuration

### Change Port

Edit `server.js` or set the environment variable:

```bash
PORT=8080 npm start
```

### Database Location

The SQLite database (`recipes.db`) is stored in the project root. To backup your recipes, simply copy this file.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recipes` | Get all recipes (supports `?search=` and `?category=`) |
| GET | `/api/recipes/:id` | Get single recipe |
| POST | `/api/recipes` | Create new recipe (multipart form) |
| PUT | `/api/recipes/:id` | Update recipe |
| DELETE | `/api/recipes/:id` | Delete recipe |
| GET | `/api/categories` | Get all categories |

## Troubleshooting

### Permission Issues
```bash
sudo chown -R $USER:$USER ~/recipe-website
```

### Port Already in Use
```bash
# Find process using port 3001
sudo lsof -i :3001
# Kill the process or use a different port
```

### Database Locked
If you get database lock errors, ensure only one instance of the server is running.

## License

MIT License - Feel free to modify and use for personal projects!
