"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTransactionStatusDto = exports.CreateTransactionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateTransactionDto {
    amount;
    merchant_id;
    pix_key;
    description;
    transaction_id;
}
exports.CreateTransactionDto = CreateTransactionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Valor da transação',
        example: 100.50,
        minimum: 0.01,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreateTransactionDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID do comerciante',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "merchant_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Chave PIX do destinatário',
        example: 'exemplo@email.com',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "pix_key", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Descrição da transação',
        example: 'Pagamento de produto',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID único da transação',
        example: 'TRX123456789',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "transaction_id", void 0);
class UpdateTransactionStatusDto {
    status;
}
exports.UpdateTransactionStatusDto = UpdateTransactionStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Status da transação',
        example: 'completed',
        enum: ['completed', 'failed', 'chargeback'],
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTransactionStatusDto.prototype, "status", void 0);
//# sourceMappingURL=transaction.dto.js.map