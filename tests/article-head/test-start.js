// node --inspect web-dfp-analysis.js <domain-no-from-domainList.js> <mobile==1, tablet == 2>
// node --inspect web-dfp-analysis.js <domain-no-from-domainList.js> <mobile==1, tablet == 2>
// break on first line
// node --debug-brk --inspect web-dfp-analysis.js <domain-no-from-domainList.js> <mobile==1, tablet == 2>
// node  --inspect web-dfp-analysis.js 1 1


const puppeteer = require('puppeteer');
const expect = require('chai').expect;
const { startServer } = require('polyserve');
const del = require('del');
const fs = require('fs');

const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

// which comp u r testing and created the folder of same name and check package.json for the test script also
const componentIntest = "article-head"; //get from CLI

//Golden Screenshot Domain
var goldenDomain = "https://www.skynewsarabia.com" ; //get from CLI

//test Screenshot Domain
// var testDomain = "https://www.skynewsarabia.com"; //get from CLI
var testDomain = "https://www.leg7.webdev.skynewsarabia.com"; //get from CLI


//page url

var pageUrl = `/web/article/1014517`;

/*START: Devices Desc*/
const devices = require('puppeteer/DeviceDescriptors');
const iPad = devices['iPad'];
const iPhone = devices['iPhone 6'];
/*END: Devices Desc*/

/*START: test screenshot and golden screenshot folder*/
const testDir = `tests/${componentIntest}/test_screenshot`;
const goldenDir = `tests/${componentIntest}/golden_screenshot`;
/*END: test screenshot and golden screenshot folder*/


/*START: Delete the all screen shots for the current device*/
var deletedPaths = del.sync([
     `./tests/${componentIntest}/test_screenshot/**`,
     `./tests/${componentIntest}/golden_screenshot/**`,
     `!./tests/${componentIntest}/test_screenshot`,
     `!./tests/${componentIntest}/golden_screenshot`
     ], {force: true});

(function(paths) {
    console.log('Files and folders that would be deleted:\n', paths.join('\n'));
})(deletedPaths);



/*END: Delete the all screen shots for the current device*/






describe('see screenshots are correct', function() {
    let polyserve, browser, page;

    // This is ran when the suite starts up.
    before(async function() {
        // This is where you would substitute your python or Express server or whatever.
        polyserve = await startServer({port:4000});

        // debugger;
        // Create the test directory if needed. This and the goldenDir
        // variables are global somewhere.
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
        if (!fs.existsSync(goldenDir)) fs.mkdirSync(goldenDir);

        // And its desktop screen/small screen subdirectories.
        if (!fs.existsSync(`${testDir}/desktop`)) fs.mkdirSync(`${testDir}/desktop`);
        if (!fs.existsSync(`${testDir}/tablet`)) fs.mkdirSync(`${testDir}/tablet`);
        if (!fs.existsSync(`${testDir}/mobile`)) fs.mkdirSync(`${testDir}/mobile`);

        // And its desktop screen/small screen subdirectories. For Golden Screenshots
        if (!fs.existsSync(`${goldenDir}/desktop`)) fs.mkdirSync(`${goldenDir}/desktop`);
        if (!fs.existsSync(`${goldenDir}/tablet`)) fs.mkdirSync(`${goldenDir}/tablet`);
        if (!fs.existsSync(`${goldenDir}/mobile`)) fs.mkdirSync(`${goldenDir}/mobile`);
    });

    // This is ran when the suite is done. Stop your server here.
    after((done) => {polyserve.close(done);});

    // This is ran before every test. It's where you start a clean browser.
    beforeEach(async function() {

        browser = await puppeteer.launch({

            headless: false,
            ignoreHTTPSErrors: true,
            executablePath: '/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary',
            args: ["--window-size=2400,1239"]


        });


        page = await browser.newPage();
    });

    // This is ran after every test; clean up after your browser.
    // afterEach(() => browser.close());

    // DESKTOP screen tests!
    describe('DESKTOP screen', function() {
        beforeEach(async function() {
            await page.setViewport({ width: 2300, height: 1239 });
        });


        it('article head text', async function() {
            return takeAndCompareScreenshot(pageUrl, 'desktop', '.article-head', 'article-head');
        });



        // And your other routes, 404, etc.
    });


    // TABLET screen tests!
    describe('TABLET screen', function() {
        beforeEach(async function() {
            await page.emulate(iPad);
        });


        it('article head text', async function() {
            return takeAndCompareScreenshot(pageUrl, 'tablet', '.article-head', 'article-head');
        });



        // And your other routes, 404, etc.
    });


    // MOBILE screen tests!
    describe('MOBILE screen', function() {
        beforeEach(async function() {
            await page.emulate(iPhone);
        });


        it('article head text', async function() {
            return takeAndCompareScreenshot(pageUrl, 'mobile', '.article-head', 'article-head');
        });



        // And your other routes, 404, etc.
    });


    



    // - page is a reference to the Puppeteer page.
    // - route is the path you're loading, which I'm using to name the file.
    // - filePrefix is either "wide" or "narrow", since I'm automatically testing both.
    async function takeAndCompareScreenshot(pageUrl, type, selector, componentName) {


        let goldenCompleteUrl = `${goldenDomain}${pageUrl}`;
        let testCompleteUrl = `${testDomain}${pageUrl}`;

        // Start the browser, go to that page, and take a screenshot.
        await page.goto(testCompleteUrl);
        await page.waitFor(10000);
        let el = await page.$(selector);
        await el.screenshot({ path: `${testDir}/${type}/${componentName}.png` });


        // For Global Screenshot
        await page.goto(goldenCompleteUrl);
        await page.waitFor(10000);
        el = await page.$(selector);
        await el.screenshot({ path: `${goldenDir}/${type}/${componentName}.png` });


        // Test to see if it's right.
        return compareScreenshots(componentName, type);
    }


    function compareScreenshots(fileName, type) {
        return new Promise((resolve, reject) => {
            const img1 = fs.createReadStream(`${testDir}/${type}/${fileName}.png`).pipe(new PNG()).on('parsed', doneReading);
            const img2 = fs.createReadStream(`${goldenDir}/${type}/${fileName}.png`).pipe(new PNG()).on('parsed', doneReading);

            let filesRead = 0;

            function doneReading() {
                // Wait until both files are read.
                if (++filesRead < 2) return;

                // The files should be the same size.
                expect(img1.width, 'image widths are the same').equal(img2.width);
                expect(img1.height, 'image heights are the same').equal(img2.height);

                // Do the visual diff.
                const diff = new PNG({ width: img1.width, height: img2.height });
                const numDiffPixels = pixelmatch(
                    img1.data, img2.data, diff.data, img1.width, img1.height, { threshold: 0.1 });

                // The files should look the same.
                expect(numDiffPixels, 'number of different pixels').equal(0);
                resolve();
            }
        });
    }


});