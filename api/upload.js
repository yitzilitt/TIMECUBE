const { send } = require('micro');
const multer  = require('multer');
const fs = require('fs');
const upload = multer({ dest: '/tmp/' });

const uploadMiddleware = upload.single('filename');

module.exports = async (req, res) => {
  uploadMiddleware(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      send(res, 500, err);
      return;
    } else if (err) {
      send(res, 500, err);
      return;
    }

    // Now multer has processed the request, you can access your form data
    console.log(req.file);

    // Read file
    fs.readFile(req.file.path, 'utf8', function(err, data) {
      if (err) return send(res, 500, err);

      // Perform operation on file
      const newData = data + '\nAppend some text here!';

      // Write operation result to new file
      const outputPath = `/tmp/edited_${req.file.originalname}`;
      fs.writeFile(outputPath, newData, function(err) {
        if (err) return send(res, 500, err);
        console.log('File edited successfully!');

        // Send file download response
        res.download(outputPath);
      });
    });
  });
};
