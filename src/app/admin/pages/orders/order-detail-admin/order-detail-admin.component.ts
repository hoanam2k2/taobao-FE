import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Route } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { UserAuthService } from 'src/app/auth/user-auth.service';
import { StatusResponse } from 'src/app/enums/status-response.enum';
import { OrderDetailDTO } from 'src/app/interfaces/OrderDetailDTO.interface';
import { OrderDTO } from 'src/app/interfaces/OrderDTO.interface';
import { ProductDto } from 'src/app/interfaces/ProductDto.interface';
import { environment } from 'src/environments/environment';
import { ProductsService } from '../../products/product.service';
import { OrderAdminService } from '../order-admin.service';
import { OrderDetailService } from './order-detail.service';

@Component({
  selector: 'app-order-detail-admin',
  templateUrl: './order-detail-admin.component.html',
  styleUrls: ['./order-detail-admin.component.scss'],
})
export class OrderDetailAdminComponent implements OnInit {
  order!: OrderDTO;
  products: ProductDto[] = [];
  isLoadingOrder = false;
  isLoadingProducts = false;
  baseUrl = environment.baseUrl;
  totalMoney = 0;
  formCart!: FormGroup;
  order_id: string | null;
  isLoadingBtnSave = false;
  constructor(
    private fb: FormBuilder,
    private orderAdminService: OrderAdminService,
    private userAuthService: UserAuthService,
    private message: NzMessageService,
    private route: ActivatedRoute,
    private productService: ProductsService,
    private orderDetailService: OrderDetailService,
    private modal: NzModalService
  ) {
    this.order_id = this.route.snapshot.paramMap.get('order_id');
  }

  async ngOnInit() {
    this.isLoadingOrder = true;
    this.isLoadingProducts = true;
    await this.orderAdminService
      .getOrderByOrderId(this.order_id as string)
      .toPromise()
      .then((res: any) => {
        if (res) {
          this.order = res.data.order;
        }
      })
      .catch((err) => this.message.error('L???i l???y chi ti???t ????n h??ng'));
    this.isLoadingOrder = false;
    console.log(this.order);

    this.formCart = this.fb.group({
      customerName: [
        this.order.customerName,
        Validators.compose([
          Validators.required,
          Validators.maxLength(225),
          Validators.minLength(6),
        ]),
      ],
      phoneNumber: [
        this.order.phoneNumber,
        Validators.compose([
          Validators.required,
          Validators.pattern('(84|0[3|5|7|8|9])+([0-9]{8})'),
        ]),
      ],
      deliveryAddress: [
        this.order.deliveryAddress,
        Validators.compose([Validators.required]),
      ],
      note: [this.order.note, Validators.compose([Validators.maxLength(225)])],
    });
    if (this.order.orderStatus != 4) {
      this.isLoadingProducts = true;
      await this.productService
        .getPageProduct()
        .toPromise()
        .then((res: any) => {
          this.products = res.data.products.items;
        })
        .catch((err) => {
          this.message.error('Error get list users');
        });
      this.isLoadingProducts = false;
    }
    this.calculateTotalMoney();
  }
  changeAmountProduct(event: number, product: ProductDto, index: number) {
    this.order.orderDetailDTOS[index].amount = event;
    this.calculateTotalMoney();
  }

  calculateTotalMoney() {
    this.order.totalMoney = this.order.orderDetailDTOS
      .map((item) => item.amount * item.product.price)
      .reduce((prev, next) => prev + next);
  }
  addToOrder(product: ProductDto) {
    let orderDetail = {
      product,
      amount: 1,
      price: product.price,
      orderId: this.order.id,
    };
    this.orderDetailService.createOrderDetail(orderDetail).subscribe(
      (res: any) => {
        let orderDetailDTOS: OrderDetailDTO[] = this.order.orderDetailDTOS;
        orderDetailDTOS.push(res.data.order_detail);
        this.order.orderDetailDTOS = [...orderDetailDTOS];
      },
      (err) => {
        this.message.error('L???i th??m s???n ph???m v??o ????n h??ng');
      },
      () => {}
    );
    this.calculateTotalMoney();
  }
  removeProductToOrder(order_detail_id: number, index: number) {
    this.modal.create({
      nzTitle: 'X??c nh???n x??a',
      nzContent: 'B???n c?? mu???n x??a s???n ph???m n??y kh???i ????n h??ng kh??ng?',
      nzOnOk: () => {
        this.orderDetailService.deleteOrderDetail(order_detail_id).subscribe(
          (res: any) => {
            if (res.statusCode == StatusResponse.OK) {
              let orderDetailDTOS: OrderDetailDTO[] =
                this.order.orderDetailDTOS;
              orderDetailDTOS.splice(index, 1);
              this.order.orderDetailDTOS = [...orderDetailDTOS];
            }
          },
          () => {
            this.message.error('L???i x??a s???n ph???m v??o ????n h??ng');
          },
          () => {}
        );
        this.calculateTotalMoney();
      },
      nzOnCancel: () => {
        this.message.info('cancel');
      },
    });
  }
  submitForm() {
    this.isLoadingBtnSave = true;
    if (this.formCart.valid) {
      this.order = { ...this.order, ...this.formCart.value };
      this.orderAdminService.updateOrder(this.order).subscribe(
        (res) => {
          if (res) {
            this.message.success('C???p nh???t ????n h??ng th??nh c??ng');
          }
        },
        (err) => this.message.error('C???p nh???t ????n h??ng th???t b???i'),
        () => {
          this.isLoadingBtnSave = false;
        }
      );
    }
  }

  updateOrderStatus(event: number): void {
    this.orderAdminService.updateOrderStatus(this.order.id, event).subscribe(
      (res) => {
        if (res) {
          this.message.success('C???p nh???t ????n h??ng th??nh c??ng');
          this.order.orderStatus = event;
        }
      },
      (err) => this.message.error('C???p nh???t ????n h??ng th???t b???i'),
      () => {
        this.isLoadingBtnSave = false;
      }
    );
  }
}
