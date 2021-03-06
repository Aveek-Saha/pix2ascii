const Jimp = require('jimp');
const ds = require('js-data-structs');
// const chalk = require('chalk');

exports.convert = function (file, width, options) {
    var greyscale = {
        gscale_70: "@$B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\" ^`'.".split("").reverse().join(""),
        gscale_10: "@%#*+=-:. ".split("").reverse().join(""),
        gscale_block: "░▒▓█"
    }

    var gscale = greyscale[options]

    var norm_factor = (255 * 4) / gscale.length
    // console.log(gscale);

    return Jimp.read(file).then(
        (image) => {
            // if (err) throw err;
            var height = Math.round((image.bitmap.height * width) / (2 * image.bitmap.width))
            
            image
                .resize(width, height) // resize
                .greyscale() // set greyscale

            var arr = []
            var color = []

            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {

                var red = this.bitmap.data[idx + 0];
                var green = this.bitmap.data[idx + 1];
                var blue = this.bitmap.data[idx + 2];
                var alpha = this.bitmap.data[idx + 3];

                var rgba = red + green + blue + alpha
                var intensity = Math.round(rgba / norm_factor) - 1
                // var col = Jimp.intToRGBA(image.getPixelColor(x, y))

                arr.push(gscale[intensity])
                // color.push(chalk.rgb(col.r, col.g, col.b)(gscale[intensity]))
                // console.log(intensity)
            });

            var matrix = [];
            // while (color.length) matrix.push(color.splice(0, dim.width));
            while (arr.length) matrix.push(arr.splice(0, width));

            var toWrite = ""

            matrix.forEach(element => {
                // console.log(element.join(""));
                toWrite += element.join("") + '\n'
            });
            var lzw = ds.LZW(gscale + '\n')
            var comp = lzw.encode(toWrite)

            return comp

        }
    ) 
}

