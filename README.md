# hive-sample-api
Hive simple API as part of a tutorial in my blog: https://peakd.com/@theghost1980



# Script .sh
With the following script bellow you can:
1. Automate the fetching process from this repo.
2. Create `node-api` folder to place the repo files.
3. run the `npm i` to install node modules so your app can run in your VPS.
4. Create an pm2 process(if you don't have account you may need to create one in https://pm2.keymetrics.io/) and start the process.
5. It will make a curl request to the server, so we can be sure that at least internally the nodeapp is working as it should. You should see the results.
6. Open the live logs of the app running.

Script
----
#!/bin/bash

# 1. Create a node-api folder
echo "Creating directory node-api..."
mkdir node-api

# Check if directory creation was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to create directory node-api. It might already exist."
    # Exit if creation failed and the directory doesn't exist
    if [ ! -d "node-api" ]; then
        exit 1
    fi
fi
echo "Directory node-api ready."

# 2. Fetch the repo into the new folder
REPO_URL="https://github.com/theghost1980/hive-sample-api.git"
FOLDER_NAME="hive-sample-api" # The name of the folder created by git clone
REPO_DIR="node-api/$FOLDER_NAME"

if [ -d "$REPO_DIR" ]; then
    echo "Repository directory already exists. Skipping cloning."
else
    echo "Cloning repository $REPO_URL into $REPO_DIR..."
    git clone "$REPO_URL" "$REPO_DIR"

    # Check if cloning was successful
    if [ $? -ne 0 ]; then
        echo "Error: Failed to clone repository."
        exit 1
    fi
    echo "Repository cloned successfully."
fi


# 3. Navigate into the cloned repository folder
echo "Changing directory to $REPO_DIR..."
cd "$REPO_DIR"

# Check if navigating was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to navigate into repository directory."
    exit 1
fi
echo "Current directory is $(pwd)."

# 4. Run npm install
echo "Running npm install..."
# Only run npm install if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    npm install
    # Check if npm install was successful
    if [ $? -ne 0 ]; then
        echo "Error: npm install failed."
        exit 1
    fi
    echo "npm install completed."
else
    echo "node_modules directory exists. Skipping npm install."
fi


# 5. Run the start command using pm2 and register as api-tutorial
PM2_PROCESS_NAME="api-tutorial"
echo "Starting application with pm2 as $PM2_PROCESS_NAME..."

# Check if the process is already running
if pm2 list | grep -q "$PM2_PROCESS_NAME"; then
    echo "PM2 process '$PM2_PROCESS_NAME' is already running. Restarting it."
    pm2 restart "$PM2_PROCESS_NAME"
     if [ $? -ne 0 ]; then
        echo "Error: pm2 failed to restart the application."
        exit 1
    fi
else
    echo "PM2 process '$PM2_PROCESS_NAME' not found. Starting it."
    # 'npm start' command will execute the script defined in "start" in package.json
    pm2 start npm --name "$PM2_PROCESS_NAME" -- run start
     if [ $? -ne 0 ]; then
        echo "Error: pm2 failed to start the application."
        exit 1
    fi
fi

echo "Application started/restarted with pm2 as $PM2_PROCESS_NAME."

# Add a small delay to allow the server to start
echo "Waiting for the server to start (10 seconds)..."
sleep 10

# 6. Make a curl request to the API endpoint
API_URL="http://localhost:3000/find-spanish-posts-last-6-days"
echo "Making a curl request to $API_URL..."
curl "$API_URL"

# Add a newline after the curl output for cleaner console
echo ""

# 7. Open logs for api-tutorial (optional, as curl output is already shown)
# If you still want to see the PM2 logs after the curl request, uncomment the next two lines:
# echo "Displaying logs for $PM2_PROCESS_NAME..."
# pm2 logs "$PM2_PROCESS_NAME"

exit 0
----
