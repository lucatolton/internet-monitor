# Internet Monitor

Internet Monitor pings a specified IP address and does a speed test at certain intervals which can be changed in `config.json`. The default is ping `1.1.1.1` 4 times every 30000ms (30 seconds), and do a speedtest every 3600000ms (1 hour). All of this is logged in `log.txt` and also to a database.

Internet Monitor runs on port 5514. To access the graphs, use the following URLs (replacing ip with the IP address of the device you're running Internet Monitor on):

- Speedtest: http://ip:5514/speedtest
- Ping: http://ip:5514/ping

By default, you will be shown the data from the past 24 hours. You can also add a query string to the end of the URL to get data from a different duration:

- Hours: `?h=2` will get 2 hours of data. You can change this to get up to 23 hours of data
- Days: `?d=5` will get 5 days of data. You can change this to get up to 29 days of data