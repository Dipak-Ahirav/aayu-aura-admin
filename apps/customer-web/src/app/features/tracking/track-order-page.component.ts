import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import type { PublicOrderTrackingDto } from '@aayu-aura/shared-types';
import { formatPrice } from '../../shared/utilities/storefront-demo-data';
import { TrackOrderService } from './track-order.service';

@Component({
  selector: 'aac-track-order-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="tracking-shell">
      <div class="tracking-hero">
        <div>
          <p class="eyebrow">Track order</p>
          <h1>Live saree order updates</h1>
          <p>Enter your order number with the same email or mobile used at checkout.</p>
        </div>
        <form class="tracking-form" [formGroup]="form" (ngSubmit)="track()">
          <label class="field">
            <span>Order number</span>
            <input formControlName="orderNumber" autocomplete="off" placeholder="AA-2026-0001">
          </label>
          <label class="field">
            <span>Email or mobile</span>
            <input formControlName="identifier" autocomplete="email tel" placeholder="email@example.com or mobile">
          </label>
          <button class="button primary" type="submit" [disabled]="loading()">
            {{ loading() ? 'Checking order...' : 'Track order' }}
          </button>
          @if (error()) {
            <p class="form-error">No order matched these details. Check the order number and email/mobile.</p>
          }
        </form>
      </div>

      @if (loading()) {
        <div class="tracking-card tracking-loading">
          <span></span>
          <span></span>
          <span></span>
        </div>
      } @else if (tracking(); as data) {
        <div class="tracking-summary">
          <article class="tracking-card tracking-status-card">
            <p class="eyebrow">Order {{ data.order.orderNumber }}</p>
            <h2>{{ data.order.status }}</h2>
            <p>{{ data.order.itemCount }} item(s) for {{ data.order.customerName }} · {{ data.order.maskedIdentifier }}</p>
            <div class="tracking-metrics">
              <span>
                <small>Total</small>
                <strong>{{ price(data.order.totalInPaise) }}</strong>
              </span>
              <span>
                <small>Payment</small>
                <strong>{{ data.order.paymentStatus }}</strong>
              </span>
              <span>
                <small>Due</small>
                <strong>{{ price(data.order.dueAmountInPaise) }}</strong>
              </span>
            </div>
          </article>

          <article class="tracking-card">
            <h2>Delivery</h2>
            <dl class="tracking-details">
              <div><dt>Status</dt><dd>{{ data.shipment?.status ?? 'Not shipped' }}</dd></div>
              <div><dt>Courier</dt><dd>{{ data.shipment?.courier || 'Assigned after packing' }}</dd></div>
              <div><dt>Tracking no.</dt><dd>{{ data.shipment?.trackingNumber || 'Available after dispatch' }}</dd></div>
              <div><dt>Expected</dt><dd>{{ date(data.shipment?.expectedDeliveryDate) }}</dd></div>
            </dl>
          </article>
        </div>

        <div class="tracking-grid">
          <article class="tracking-card">
            <h2>Order timeline</h2>
            <div class="customer-timeline">
              @for (step of data.timeline; track step.label) {
                <div class="customer-timeline-step" [class.is-complete]="step.completed" [class.is-current]="step.current">
                  <span></span>
                  <div>
                    <strong>{{ step.label }}</strong>
                    <p>{{ step.description }}</p>
                    @if (step.date) {
                      <small>{{ date(step.date) }}</small>
                    }
                  </div>
                </div>
              }
            </div>
          </article>

          <article class="tracking-card">
            <h2>Items</h2>
            <div class="tracking-items">
              @for (item of data.items; track item.productName + item.productCode) {
                <div>
                  <span>
                    <strong>{{ item.productName }}</strong>
                    <small>{{ item.productCode || 'Boutique saree' }} · Qty {{ item.quantity }}</small>
                  </span>
                  <b>{{ price(item.lineTotalInPaise) }}</b>
                </div>
              }
            </div>
          </article>
        </div>

        <div class="tracking-actions tracking-card">
          <div>
            <h2>Order help</h2>
            <p>{{ data.support.message }}</p>
          </div>
          @if (data.invoice) {
            <a class="button" [href]="invoiceUrl(data.invoice.downloadUrl)" target="_blank" rel="noreferrer">
              Download invoice
            </a>
          }
          <a class="button whatsapp" [href]="data.support.whatsappUrl" target="_blank" rel="noreferrer">
            WhatsApp support
          </a>
          <button type="button" [disabled]="!data.order.cancellationAllowed" (click)="openSupport('Cancel order')">
            Cancel order
          </button>
          <button type="button" [disabled]="!data.order.returnAllowed" (click)="openSupport('Return or exchange')">
            Return / exchange
          </button>
        </div>

        <article class="tracking-card">
          <h2>Returns, exchange, refund</h2>
          @if (data.returns.length > 0) {
            <div class="return-status-list">
              @for (item of data.returns; track item.returnNumber) {
                <div>
                  <strong>{{ item.returnNumber }}</strong>
                  <span>{{ item.status }} · {{ item.resolution }}</span>
                  <small>
                    Refund {{ price(item.refundAmountInPaise) }}
                    @if (item.exchangeProductName) {
                      · Exchange: {{ item.exchangeProductName }}
                    }
                  </small>
                </div>
              }
            </div>
          } @else {
            <p class="muted-copy">No return, exchange, or refund request is active for this order.</p>
          }
        </article>
      } @else {
        <div class="tracking-card tracking-empty">
          <p class="eyebrow">Secure tracking</p>
          <h2>Track delivery, invoice, cancellation, return, exchange, and refund status.</h2>
          <p>Your order details will appear here after verification.</p>
        </div>
      }
    </section>
  `,
})
export class TrackOrderPageComponent {
  private readonly trackingService = inject(TrackOrderService);
  private readonly route = inject(ActivatedRoute);

  readonly form = new FormGroup({
    orderNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    identifier: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly tracking = signal<PublicOrderTrackingDto | null>(null);
  protected readonly supportUrl = computed(() => this.tracking()?.support.whatsappUrl ?? 'https://wa.me/');

  constructor() {
    const orderNumber = this.route.snapshot.queryParamMap.get('orderNumber') ?? '';
    const identifier = this.route.snapshot.queryParamMap.get('identifier') ?? '';
    if (orderNumber) this.form.controls.orderNumber.setValue(orderNumber);
    if (identifier) this.form.controls.identifier.setValue(identifier);
    if (orderNumber && identifier) queueMicrotask(() => this.track());
  }

  protected track(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(true);
      return;
    }

    this.loading.set(true);
    this.error.set(false);
    this.trackingService.track(this.form.getRawValue()).subscribe((data) => {
      this.loading.set(false);
      this.tracking.set(data);
      this.error.set(!data);
    });
  }

  protected price(value: number): string {
    return formatPrice(value);
  }

  protected date(value?: string): string {
    if (!value) return 'Not updated';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  protected invoiceUrl(downloadUrl: string): string {
    return this.trackingService.invoiceUrl(downloadUrl);
  }

  protected openSupport(topic: string): void {
    const orderNumber = this.tracking()?.order.orderNumber ?? this.form.controls.orderNumber.value;
    const url = `https://wa.me/?text=${encodeURIComponent(`${topic} help for order ${orderNumber}.`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
