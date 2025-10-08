# Wpp Agent ☎️

The `wpp-agent` application is an agent designed to be a gateway for communication between a WhatsApp client and servers. It uses queues to manage actions.

## Features 💪

- **WhatsApp Integration**: Provides queues for communication with WhatsApp clients.
- **Queue Management**: Utilizes AMQP for managing action queues.
- **Media Handling**: Supports sending and receiving media files.
- **Structured logging**: Implements structured logging for better monitoring and debugging.

## Installation 🚀

To start using `wpp-agent`, in addition to runnning the project, you need to have a running instance of RabbitMQ. You can use Docker to quickly set up RabbitMQ:

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:4.2-rc-management-alpine
```

Then, start the application:

```bash
docker build -t wpp-agent . \
  && docker run -d  --name wpp-agent --env-file .env -v ./vol/wpp-agent:/app/wpp-storage:rw:rw wpp-agent
```

or use `docker compose` for the hard work:

```bash
services:
  wpp-agent:
    container_name: wpp-agent
    build: .
    env_file: .env
    networks: [rabbitmq]
    volumes: [./vol/wpp-agent:/app/wpp-storage:rw]
```

> Make sure to create a `.env` file with the necessary environment variables. Check the section [below](#configuration-️) for more details.

## Configuration ⚙️

### Environment Variables 🌐

For starting the application, you need to set the following environment variables:

| Variable    | Description                              | Example Value                      |
| ----------- | ---------------------------------------- | ---------------------------------- |
| `AMQP__URI` | The AMQP URI for connecting to RabbitMQ. | `"amqp://user:pass@rabbitmq:5672"` |

Optionally, you can set the following optional environment variables:

| Variable                   | Description                                            | Default values         | Possible values                                                |
| -------------------------- | ------------------------------------------------------ | ---------------------- | -------------------------------------------------------------- |
| `LOG_LEVEL`                | The log level of the application.                      | `"INFO"`               | `"fatal"`, `"error"`, `"warn"`, `"info"`, `"debug"`, `"trace"` |
| `WPP__STORAGE`             | The storage type to be used.                           | `"localpath"`          | `"localpath"`                                                  |
| `WPP__STORAGE_LOCALPATH`   | The localpath to storage the current whatsapp session. | `"./wpp-storage"`      | `<any valid path>`                                             |
| `AMQP__EXCHANGE`           | The AMQP exchange name to be used.                     | `"wpp-agent"`          | `<any valid exchange name>`                                    |
| `AMQP__EXCHANGE_TYPE`      | The AMQP exchange type to be used.                     | `"topic"`              | `"direct"`, `"fanout"`, `"topic"`, `"headers"`                 |
| `AMQP__MSG_SEND_QUEUE`     | The AMQP queue name for sending messages.              | `"wpp-agent.msg.send"` | `<any valid queue name>`                                       |
| `AMQP__MSG_RECEIVED_QUEUE` | The AMQP queue name for received messages.             | `"*.msg.received"`     | `<any valid queue topic name>`                                 |

<!-- | `AMQP__CHAT_STATUS_QUEUE`  | The AMQP queue name for chat status updates.           | `"wpp-agent.chat.status"` | `<any valid queue name>`                                       | -->

### Queues 📥

As the application uses AMQP for managing actions and events, you need to configure them in [Configurations](#configuration-️) section or use the default values.

Current implemented events:

- `RECEIVED_MESSAGE`: When a new message is received, parses, retrieves media and sends to the `AMQP__MSG_RECEIVED_QUEUE` queue.

Current implemented actions:

- `SEND_MESSAGE`: Sends a message to a specific chat, listens on the `AMQP__MSG_SEND_QUEUE` queue.
<!-- - `SEND_CHAT_STATUS`: Set the chat status (typing, recording, paused), listens on the `AMQP__CHAT_STATUS_QUEUE` queue. -->
