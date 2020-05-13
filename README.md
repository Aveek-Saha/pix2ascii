<h1 align="center">
 <br>
  Pix 2 Ascii <img width = "32px" src = "https://raw.githubusercontent.com/Aveek-Saha/pix2ascii/master/public/favicon.png">
</h1>
<h3 align="center"> Convert your images into ASCII art <h3>

![CI/CD](https://github.com/Aveek-Saha/pix2ascii/workflows/CI/CD/badge.svg?style=for-the-badge)

### Website - [pix2ascii](https://pix2ascii.web.app/)

# Converting an image
1. Simply upload an image smaller than 5mb in one of the supported formats (jpg, png or bmp).
2. Pick the number of characters you want in a row. This is like the resolution of the generated image.
3. Pick the style you want for your ascii art, each character set gives a unique look to the image.

# Development
- Clone the repo and run `npm i` to install dependencies. 
- Make sure you have the Firebase CLI installed as well as the emulator for local development.
- To run the Firebase cloud function
```
cd functions
npm run serve
```
- To run the frontend UI
```
cd client
npm run dev
```
