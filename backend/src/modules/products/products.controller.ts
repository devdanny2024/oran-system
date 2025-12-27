import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() payload: CreateProductDto) {
    return this.productsService.create(payload);
  }

  @Get()
  list() {
    return this.productsService.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.productsService.getById(id);
  }
}

