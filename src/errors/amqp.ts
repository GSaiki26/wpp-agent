import { WPPAgentError } from "./errors";

export class AMQPError extends WPPAgentError {}

export class NotConnectedError extends AMQPError {}
