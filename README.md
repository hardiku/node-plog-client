# plog-client

Simple Node.js UDP client for the Plog Kafka forwarder.

### Usage

Instantiate a client and start sending messages.

```javascript
PlogClient = require('plog-client');
client = new PlogClient;
client.send("My hovercraft is full of eels.");
```

You can configure the client at initialization by passing these options:

* `host` - The host of the Plog process (default: 'localhost')
* `port` - The port on which Plog is listening (default: 23456)
* `chunkSize` - The maximum payload size for multipart datagrams (default: 64,000)
* `logger` - An optional logger instance (default: console)
* `verbose` — Enables verbose logging (default: false)
