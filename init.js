$(document).ready(() => {
    window.getROI().then((result) => {
        console.log(result);
        var ctx = document.getElementById("performance-chart").getContext('2d');
        var performanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ["Betoken", "Blockchain Index", "Bitcoin", "Ethereum"],
                datasets: [{
                    label: 'Return on investment',
                    data: [result.ROI.betoken, result.ROI.blx, result.ROI.btc, result.ROI.eth],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255,99,132,1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    xAxes: [{
                        gridLines: {
                            display: false
                        }
                    }],
                    yAxes: [{
                        gridLines: {
                            display: true
                        },
                        scaleLabel: {
                            display: true,
                            labelString: `ROI (%) from ${new Date(result.timestamp.start * 1e3).toLocaleString()} to ${new Date(result.timestamp.end * 1e3).toLocaleString()}`
                        } 
                    }]
                },
                title: {
                    display: true,
                    text: 'Return on investment comparison'
                },
                legend: {
                    display: false
                },
                tooltips: {
                    enabled: true,
                    mode: 'single',
                    displayColors: false,
                    callbacks: {
                        label: function(tooltipItems, data) { 
                            return tooltipItems.yLabel + '%';
                        }
                    }
                }
            }
        });
    });
});