# Deploying MyCashFlow to GitHub Pages

Follow this simple guide to host your application on GitHub Pages for free.

## Step 1: Create a GitHub Repository
1.  Log in to [GitHub](https://github.com).
2.  Click the **+** icon in the top right and select **New repository**.
3.  **Repository name**: `my-cashflow` (or any name you like).
4.  **Public/Private**: Choose **Public** (GitHub Pages is free for public repos).
5.  **Initialize this repository with**: Leave all these unchecked (No README, No .gitignore).
6.  Click **Create repository**.

## Step 2: Push Your Code
We have already verified your code is ready. Now run these commands in your *PowerShell* or *Command Prompt* inside the `MyCashFlow` folder:

1.  **Initialize Git** (if you haven't run the `git_setup.bat` script):
    ```bash
    git init
    git add .
    git commit -m "Initial release"
    ```

2.  **Connect to GitHub** (Replace `YOUR_USERNAME` with your actual GitHub username):
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/my-cashflow.git
    git branch -M main
    git push -u origin main
    ```

## Step 3: Enable GitHub Pages
1.  Go to your repository page on GitHub.
2.  Click on **Settings** (top menu bar).
3.  On the left sidebar, click **Pages**.
4.  Under **Build and deployment** > **Branch**:
    - Select **main**.
    - Ensure the folder is **/(root)**.
    - Click **Save**.

## Step 4: Live!
Wait about 1-2 minutes. Refresh the Pages settings page.
You will see a banner at the top:
> "Your site is live at https://your-username.github.io/my-cashflow/"

Click that link to see your CashFlow app running online!
