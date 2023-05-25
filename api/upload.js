import multer from 'multer';
import { readFile, writeFile } from 'fs';
const upload = multer({ dest: '/tmp/' });

module.exports = upload.single('filename'), function (req, res) {
  console.log(req.file);

  // Read file
  readFile(req.file.path, 'utf8', function(err, data) {
    if (err) return res.status(500).send(err);

    // Perform operation on file
    const newData = data + '\nAppend some text here!';

    // Write operation result to new file
    const outputPath = `/tmp/edited_${req.file.originalname}`;
    writeFile(outputPath, newData, function(err) {
      if (err) return res.status(500).send(err);
      console.log('File edited successfully!');

      // Send file download response
      res.download(outputPath);
    });
  });
}
