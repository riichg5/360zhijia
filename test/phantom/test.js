const phantom = require('phantom');

(async function() {
  const instance = await phantom.create();
  const page = await instance.createPage();
  await page.on('onResourceRequested', function(requestData) {
    console.info('Requesting', requestData.url);
  });

  // const status = await page.open('https://stackoverflow.com/');
  const status = await page.open('https://www.anquanke.com/post/id/87213');
  const content = await page.property('content');
  console.log(content);

  await instance.exit();
})();