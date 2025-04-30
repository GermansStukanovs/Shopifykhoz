/**
 * Gift Card Balance Checker
 *
 * This script provides functionality for checking gift card balances
 * in a Shopify store. It can be included in any theme section.
 */

class GiftCardBalanceChecker {
  constructor(container) {
    this.container = container;
    this.form = container.querySelector('.gift-card-balance__form');
    this.resultContainer = container.querySelector('.gift-card-balance__result');
    this.successContainer = container.querySelector('.gift-card-balance__success');
    this.errorContainer = container.querySelector('.gift-card-balance__error');
    this.errorMessage = container.querySelector('.gift-card-balance__error-message');
    this.balanceElement = container.querySelector('.gift-card-balance__amount');
    this.expiryElement = container.querySelector('.gift-card-balance__expiry');
    this.loadingElement = container.querySelector('.gift-card-balance__loading');

    if (this.form) {
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
    }
  }

  onSubmitHandler(event) {
    event.preventDefault();

    const giftCardInput = this.form.querySelector('input[name="gift_card_code"]');
    const giftCardCode = giftCardInput.value.trim();

    if (!giftCardCode) {
      this.showError('Please enter a gift card code.');
      return;
    }

    this.checkGiftCardBalance(giftCardCode);
  }

  showLoading() {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'block';
    }

    if (this.resultContainer) {
      this.resultContainer.style.display = 'none';
    }
  }

  hideLoading() {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
    }
  }

  showSuccess(balance, expiry) {
    if (!this.resultContainer || !this.successContainer) return;

    this.resultContainer.style.display = 'block';
    this.successContainer.style.display = 'block';

    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
    }

    // Format the balance as currency
    if (this.balanceElement) {
      const formattedBalance = this.formatMoney(balance);
      this.balanceElement.textContent = formattedBalance;
    }

    // Format the expiry date if available
    if (expiry && this.expiryElement) {
      const expiryDate = new Date(expiry);
      this.expiryElement.textContent = expiryDate.toLocaleDateString();
    }
  }

  showError(message) {
    if (!this.resultContainer || !this.errorContainer) return;

    this.resultContainer.style.display = 'block';
    this.errorContainer.style.display = 'block';

    if (this.successContainer) {
      this.successContainer.style.display = 'none';
    }

    if (this.errorMessage) {
      this.errorMessage.textContent = message;
    }
  }

  formatMoney(cents) {
    if (typeof cents === 'string') {
      cents = cents.replace('.', '');
    }

    const value = Number.parseInt(cents, 10);

    try {
      // Try to use the Shopify money format if available
      if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
        return Shopify.formatMoney(value);
      }
    } catch (e) {
      console.error('Error using Shopify.formatMoney:', e);
    }

    // Fallback to Intl.NumberFormat
    try {
      const formatter = new Intl.NumberFormat(document.documentElement.lang || 'en', {
        style: 'currency',
        currency: document.querySelector('meta[property="og:price:currency"]')?.content || 'USD',
        minimumFractionDigits: 2,
      });

      return formatter.format(value / 100);
    } catch (e) {
      console.error('Error formatting money with Intl.NumberFormat:', e);
      // Very basic fallback
      return '$' + (value / 100).toFixed(2);
    }
  }

  checkGiftCardBalance(code) {
    this.showLoading();

    // Use the Shopify AJAX API to check the gift card balance
    fetch('/apps/gift-cards/check-balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code: code }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network error. Please try again later.');
        }
        return response.json();
      })
      .then((data) => {
        this.hideLoading();

        if (data.error) {
          this.showError(data.error);
        } else if (data.balance !== undefined) {
          this.showSuccess(data.balance, data.expires_on);
        } else {
          this.showError('An unknown error occurred. Please try again later.');
        }
      })
      .catch((error) => {
        this.hideLoading();
        this.showError(error.message || 'Network error. Please try again later.');
      });
  }
}

// Initialize all gift card balance checkers on the page
document.addEventListener('DOMContentLoaded', () => {
  const giftCardBalanceContainers = document.querySelectorAll('.gift-card-balance');

  giftCardBalanceContainers.forEach((container) => {
    new GiftCardBalanceChecker(container);
  });
});

// Support for Shopify's section rendering
document.addEventListener('shopify:section:load', (event) => {
  const container = event.target.querySelector('.gift-card-balance');

  if (container) {
    new GiftCardBalanceChecker(container);
  }
});
