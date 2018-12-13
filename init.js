$(document).ready(() => {
    window.getROI().then((result) => {
        console.log(result);
    });
});