import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  async create(payload: CreateProductDto) {
    return {
      message: 'Create product not yet implemented',
      payload,
    };
  }

  async list() {
    return {
      message: 'List products not yet implemented',
      items: [],
    };
  }

  async getById(id: string) {
    return {
      message: 'Get product not yet implemented',
      id,
    };
  }
}

