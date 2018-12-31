$(document).ready(() => {
    $("#performance-chart-wrapper").LoadingOverlay("show", {
        background: "rgba(255, 255, 255, 0)"
    });
    window.getROI().then((result) => {
        let NUM_DECIMALS = 4; // 4 decimals for stats
        let MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        $(".1-month-roi").text(`${result.betokenStats.ROI.oneMonth.toFormat(NUM_DECIMALS)}`);
        $(".inception-roi").text(`${result.betokenStats.ROI.sinceInception.toFormat(NUM_DECIMALS)}`);
        $(".sortino-ratio").text(`${result.betokenStats.SortinoRatio.toFormat(NUM_DECIMALS)}`);
        $(".std").text(`${result.betokenStats.Std.toFormat(NUM_DECIMALS)}`);

        var timestamps = [];
        for (var i = 0; i < result.timestamps.length; i++) {
            timestamps.push(new Date(result.timestamps[i].start * 1e3).toLocaleDateString());
        }
        timestamps.push(new Date(result.timestamps[result.timestamps.length - 1].end * 1e3).toLocaleDateString());

        var xLabels = [];
        for (var i = 0; i < result.timestamps.length; i++) {
            var date = new Date(result.timestamps[i].start * 1e3);
            var formattedString = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
            xLabels.push(formattedString);
        }
        xLabels.push("Now");

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