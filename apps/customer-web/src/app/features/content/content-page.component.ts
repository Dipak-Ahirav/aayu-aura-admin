import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

interface ContentBlock {
  heading: string;
  body: string[];
}

interface ContentPage {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  blocks: ContentBlock[];
  cta?: {
    label: string;
    link: string;
  };
}

const contentPages: Record<string, ContentPage> = {
  about: {
    eyebrow: 'Our story',
    title: 'Aayu & Aura brings premium saree shopping online with clarity and care.',
    description:
      'We curate occasion-ready sarees, explain product details clearly, and keep the buying journey simple from discovery to delivery.',
    highlights: ['Premium saree curation', 'Transparent price breakdown', 'Customer-first support'],
    blocks: [
      {
        heading: 'Boutique curation',
        body: [
          'Every collection is organized around how customers actually shop: fabric, occasion, colour, budget, and saree type.',
          'Product pages highlight blouse details, saree length, care guidance, stock status, and delivery information so shoppers can decide confidently.',
        ],
      },
      {
        heading: 'Clear customer journey',
        body: [
          'Wishlist, quick view, cart, checkout, order tracking, returns, exchange, and refund flows are designed to stay visible and easy to use.',
          'WhatsApp support is available for product questions, styling help, order help, and post-purchase support.',
        ],
      },
    ],
    cta: { label: 'Shop new arrivals', link: '/shop' },
  },
  faq: {
    eyebrow: 'Help centre',
    title: 'Frequently asked questions',
    description:
      'Quick answers for saree shopping, payment, delivery, returns, exchange, refunds, account, and order support.',
    highlights: ['COD and prepaid options', 'Order tracking', 'Return and exchange help'],
    blocks: [
      {
        heading: 'How do I know if COD is available?',
        body: [
          'COD availability is checked during cart and checkout using the delivery PIN code and cart value.',
          'If COD is unavailable, you can continue with UPI, card, or net banking where payment options are enabled.',
        ],
      },
      {
        heading: 'Can I change or cancel my order?',
        body: [
          'Orders can be cancelled before dispatch from the order tracking flow or by contacting support.',
          'Once dispatched, cancellation depends on courier status and may move into return or exchange flow.',
        ],
      },
      {
        heading: 'How do I request a return or exchange?',
        body: [
          'Open Track order, verify your order number and contact detail, then check return, exchange, and refund status.',
          'Items must be unused, with original tags, packaging, and invoice unless the issue is a verified product defect.',
        ],
      },
      {
        heading: 'Will blouse stitching or fall/pico be included?',
        body: [
          'Blouse details are shown on the product page. Any add-on services must be selected before checkout when available.',
        ],
      },
    ],
    cta: { label: 'Track an order', link: '/track-order' },
  },
  'shipping-policy': {
    eyebrow: 'Delivery',
    title: 'Shipping policy',
    description:
      'Shipping estimates, charges, and serviceability are shown clearly before checkout so there are no hidden delivery surprises.',
    highlights: ['PIN-code delivery estimate', 'Free shipping rules in cart', 'Dispatch status tracking'],
    blocks: [
      {
        heading: 'Delivery estimates',
        body: [
          'Enter your PIN code in cart or checkout to check delivery estimate and courier serviceability.',
          'Estimated delivery may vary by location, courier availability, holidays, payment verification, and product readiness.',
        ],
      },
      {
        heading: 'Shipping charges',
        body: [
          'Shipping is displayed in the price breakdown before placing the order.',
          'If free shipping is available for the cart, the summary will show shipping as Free.',
        ],
      },
      {
        heading: 'Dispatch and tracking',
        body: [
          'After dispatch, order tracking shows shipment status, invoice availability, and support actions where applicable.',
          'If delivery is delayed, contact WhatsApp support with your order number for help.',
        ],
      },
    ],
    cta: { label: 'Check cart delivery', link: '/cart' },
  },
  'return-policy': {
    eyebrow: 'Post purchase',
    title: 'Return, exchange, and refund policy',
    description:
      'Return and exchange flows are built around clear eligibility, visible status, and customer support when an item needs attention.',
    highlights: ['Return request status', 'Exchange support', 'Refund tracking'],
    blocks: [
      {
        heading: 'Eligibility',
        body: [
          'Return or exchange eligibility depends on product condition, request timing, order status, and whether the item is customized.',
          'Products must be unused, unwashed, and returned with tags, invoice, packaging, and accessories.',
        ],
      },
      {
        heading: 'Exchange process',
        body: [
          'Exchange requests can be raised from order tracking when eligible.',
          'Replacement availability depends on current stock, selected colour, fabric, size, and courier pickup serviceability.',
        ],
      },
      {
        heading: 'Refund status',
        body: [
          'Refunds are processed after item inspection or successful cancellation, depending on the order stage.',
          'The refund method follows the original payment mode unless support confirms another allowed method.',
        ],
      },
    ],
    cta: { label: 'Track return status', link: '/track-order' },
  },
  'privacy-policy': {
    eyebrow: 'Customer data',
    title: 'Privacy policy',
    description:
      'We collect only the information needed to provide shopping, payment, delivery, support, and account services.',
    highlights: ['Account data protection', 'Order support use', 'Secure checkout flow'],
    blocks: [
      {
        heading: 'Information we collect',
        body: [
          'We may collect name, mobile number, email, addresses, order details, wishlist activity, cart details, payment status, and support requests.',
          'Payment details are handled by payment partners where enabled; sensitive card or banking data should not be stored in the storefront.',
        ],
      },
      {
        heading: 'How we use information',
        body: [
          'Customer data is used for account access, checkout, delivery, order tracking, invoice generation, support, returns, exchanges, and refunds.',
          'Marketing updates are sent only when customers opt in or where legally permitted.',
        ],
      },
      {
        heading: 'Data control',
        body: [
          'Customers can contact support for account, address, order, or consent-related requests.',
          'Operational records such as invoices and order history may be retained as required for business, tax, fraud prevention, and legal compliance.',
        ],
      },
    ],
    cta: { label: 'Open account', link: '/account' },
  },
  'terms-and-conditions': {
    eyebrow: 'Store terms',
    title: 'Terms and conditions',
    description:
      'These terms explain how shopping, pricing, payment, fulfilment, cancellation, returns, and support work on Aayu & Aura.',
    highlights: ['Clear product information', 'Visible payment totals', 'Support-led exceptions'],
    blocks: [
      {
        heading: 'Product and pricing',
        body: [
          'Product images, colour, fabric, pattern, blouse details, and styling suggestions are provided to help selection.',
          'Actual colour may vary slightly by display, lighting, and photography conditions. Final payable amount is shown before checkout.',
        ],
      },
      {
        heading: 'Orders and payment',
        body: [
          'Orders are confirmed after successful checkout, payment verification where applicable, and stock validation.',
          'Aayu & Aura may cancel or hold orders affected by incorrect pricing, stock mismatch, incomplete address, suspicious activity, or courier restrictions.',
        ],
      },
      {
        heading: 'Customer responsibilities',
        body: [
          'Customers should provide accurate contact, address, and PIN-code details and inspect return eligibility before raising post-purchase requests.',
          'By using the storefront, customers agree to the displayed policies for shipping, cancellation, return, exchange, refund, privacy, and support.',
        ],
      },
    ],
    cta: { label: 'Start shopping', link: '/shop' },
  },
};

const fallbackPage: ContentPage = {
  eyebrow: 'Aayu & Aura',
  title: 'Content page',
  description: 'This page is not published yet.',
  highlights: ['Storefront content', 'Coming soon', 'Customer support available'],
  blocks: [
    {
      heading: 'Need help?',
      body: ['Use WhatsApp support or return to the shop while this content page is being prepared.'],
    },
  ],
  cta: { label: 'Go to shop', link: '/shop' },
};

@Component({
  selector: 'aac-content-page',
  standalone: true,
  imports: [AsyncPipe, RouterLink],
  template: `
    @if (page$ | async; as page) {
      <section class="content-shell">
        <header class="content-hero">
          <div>
            <p class="eyebrow">{{ page.eyebrow }}</p>
            <h1>{{ page.title }}</h1>
            <p>{{ page.description }}</p>
            @if (page.cta) {
              <a class="button primary" [routerLink]="page.cta.link">{{ page.cta.label }}</a>
            }
          </div>
          <aside class="content-highlight-card" aria-label="Page highlights">
            @for (highlight of page.highlights; track highlight) {
              <span>{{ highlight }}</span>
            }
          </aside>
        </header>

        <div class="content-block-grid">
          @for (block of page.blocks; track block.heading) {
            <article>
              <h2>{{ block.heading }}</h2>
              @for (paragraph of block.body; track paragraph) {
                <p>{{ paragraph }}</p>
              }
            </article>
          }
        </div>

        <aside class="content-support-card">
          <div>
            <h2>Need product or order help?</h2>
            <p>Use WhatsApp support for saree enquiries, delivery questions, return help, and order status.</p>
          </div>
          <a class="button secondary whatsapp" href="https://wa.me/" target="_blank" rel="noopener">
            WhatsApp support
          </a>
        </aside>
      </section>
    }
  `,
})
export class ContentPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly page$ = this.route.paramMap.pipe(
    map((params) => contentPages[params.get('slug') ?? ''] ?? fallbackPage),
  );
}
