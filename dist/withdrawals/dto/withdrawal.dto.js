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
exports.UpdateWithdrawalStatusDto = exports.CreateWithdrawalDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateWithdrawalDto {
    amount;
    merchant_id;
    pix_key;
    notes;
}
exports.CreateWithdrawalDto = CreateWithdrawalDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Valor do saque',
        example: 1000.00,
        minimum: 0.01,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreateWithdrawalDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID do comerciante',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateWithdrawalDto.prototype, "merchant_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Chave PIX para recebimento',
        example: 'exemplo@email.com',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWithdrawalDto.prototype, "pix_key", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Observações',
        example: 'Saque mensal',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWithdrawalDto.prototype, "notes", void 0);
class UpdateWithdrawalStatusDto {
    status;
    notes;
}
exports.UpdateWithdrawalStatusDto = UpdateWithdrawalStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Status do saque',
        example: 'completed',
        enum: ['processing', 'completed', 'failed'],
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateWithdrawalStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Observações adicionais',
        example: 'Processado com sucesso',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateWithdrawalStatusDto.prototype, "notes", void 0);
//# sourceMappingURL=withdrawal.dto.js.map