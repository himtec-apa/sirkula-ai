import { Module, Global } from '@nestjs/common';
import { SirkulaWebsocketGateway } from './websocket.gateway.js';
import { WebsocketTestController } from './websocket-test.controller.js';

@Global()
@Module({
  controllers: [WebsocketTestController],
  providers: [SirkulaWebsocketGateway],
  exports: [SirkulaWebsocketGateway],
})
export class WebsocketModule {}
