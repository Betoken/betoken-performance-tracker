$(document).ready(() => {
    $("#performance-chart-wrapper").LoadingOverlay("show", {
        background: "rgba(255, 255, 255, 0)"
    });
    window.getROI().then((result) => {
        // 4 decimals
        let NUM_DECIMALS = 4;
        $(".1-month-roi").text(`${result.betokenStats.ROI.oneMonth.toFormat(NUM_DECIMALS)}`);
        $(".inception-roi").text(`${result.betokenStats.ROI.sinceInception.toFormat(NUM_DECIMALS)}`);
        $(".sharpe-ratio").text(`${result.betokenStats.SharpeRatio.toFormat(NUM_DECIMALS)}`);
        $(".std").text(`${result.betokenStats.Std.toFormat(NUM_DECIMALS)}`);

        var timestamps = [];
        for (var i = 0; i < result.timestamps.length; i++) {
            timestamps.push(new Date(result.timestamps[i].start * 1e3).toLocaleDateString() + '\n to ' + new Date(result.timestamps[i].end * 1e3).toLocaleDateString());
        }
        var xLabels = [];
        for (var i = 0; i < result.timestamps.length; i++) {
            xLabels.push(new Date(result.timestamps[i].start * 1e3).toLocaleDateString());
        }
        var ctx = document.getElementById("performance-chart").getContext('2d');
        var performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: xLabels,
                datasets: [
                    {
                        label: 'Betoken',
                        borderColor: '#22c88a',
                        backgroundColor: 'rgba(185, 238, 225, 0.5)',
                        fill: true,
                        data: result.ROI.betoken
                    },
                    {
                        label: 'Bitcoin',
                        borderColor: '#ff9500',
                        backgroundColor: '#ff9500',
                        fill: false,
                        data: result.ROI.btc
                    },
                    {
                        label: 'Ethereum',
                        borderColor: '#497a9a',
                        backgroundColor: '#497a9a',
                        fill: false,
                        data: result.ROI.eth
                    }
                ]
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
                        ticks: {
                            callback: function(value, index, values) {
                                return value + '%';
                            }
                        }
                    }]
                },
                title: {
                    display: true,
                    text: 'Monthly Return On Investment Comparison'
                },
                tooltips: {
                    enabled: true,
                    mode: 'index',
					intersect: false,
                    displayColors: true,
                    callbacks: {
                        label: function(tooltipItems, data) { 
                            return tooltipItems.yLabel + '%';
                        },
                        title: function(tooltipItems, data) { 
                            return timestamps[tooltipItems[0].index];
                        }
                    }
                }
            }
        });
        $("#performance-chart-wrapper").LoadingOverlay("hide");
    });
});