# Hosterino

Hosterino is a Chrome extension to check if you are currently hosting anyone on Twitch.tv and notifies you of changes in your hosting.


## Why would you want this?

If you're a streamer without a bot doing hosting for you it's pretty easy to forget
to host someone even if you're watching them. This hopefully makes it a bit easier.

Also, if your host drops due to a streamer going offline, you can notice it with this.


## How to use it?

Get it from [Chrome Web Store](https://chrome.google.com/webstore/detail/hosterino/ameldpdckeebekhhifcgadeklklhoecb).

Then click on the extension icon and configure your Twitch username in the dialog.
 
![Settings Screenshot](settings.jpg?raw=true)


## How does it look like?

Something like this.

First, you configure it:
![Extension Screenshot 1](extension_screenshot.jpg?raw=true)

Then you get notifications like this on Twitch (and the icon updates appropriately).
![Extension Screenshot 3](extension_screenshot3.jpg?raw=true)
![Extension Screenshot 2](extension_screenshot2.jpg?raw=true)


## Developers

To work on the code, you'll probably want to do the following:
 - Install Node.js
 - Install Gulp
 - Install dependencies
 - Run `gulp`

So if you have Node.js installed it's roughly as follows:

```bash
npm install -g gulp
npm install
gulp
```

That will monitor for changes in the `src/` -directory, compile necessary things and deploy them to `dist/`.

Then go to your Google Chrome settings, then open up extensions, enable `Developer mode`, and `Load unpacked extension...`. Point that to the `dist/` -folder.

