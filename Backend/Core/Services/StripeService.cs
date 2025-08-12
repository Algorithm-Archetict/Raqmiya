using Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Raqmiya.Infrastructure;
using Stripe;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Core.Services
{
    public class StripeService : IStripeService
    {
        private readonly CustomerService _customerService;
        private readonly PaymentMethodService _paymentMethodService;
        private readonly PaymentIntentService _paymentIntentService;
        private readonly string _publishableKey;

        public StripeService(IConfiguration configuration)
        {
            var stripeSecretKey = configuration["Stripe:SecretKey"];
            _publishableKey = configuration["Stripe:PublishableKey"] ?? string.Empty;
            
            if (string.IsNullOrEmpty(stripeSecretKey))
            {
                // This will prevent the app from starting if the key is missing.
                throw new ArgumentNullException(nameof(stripeSecretKey), "Stripe Secret Key is not configured in appsettings.json.");
            }
            StripeConfiguration.ApiKey = stripeSecretKey;

            _customerService = new CustomerService();
            _paymentMethodService = new PaymentMethodService();
            _paymentIntentService = new PaymentIntentService();
        }

        public async Task<Customer> CreateCustomerAsync(User user, CancellationToken cancellationToken = default)
        {
            var options = new CustomerCreateOptions
            {
                Email = user.Email,
                Name = user.Username,
                Metadata = new Dictionary<string, string>
                {
                    { "InternalUserId", user.Id.ToString() }
                }
            };
            return await _customerService.CreateAsync(options, cancellationToken: cancellationToken);
        }

        public async Task<PaymentMethod> AttachPaymentMethodAsync(string paymentMethodId, string customerId, CancellationToken cancellationToken = default)
        {
            var options = new PaymentMethodAttachOptions
            {
                Customer = customerId,
            };
            return await _paymentMethodService.AttachAsync(paymentMethodId, options, cancellationToken: cancellationToken);
        }

        public async Task SetDefaultPaymentMethodAsync(string paymentMethodId, string customerId, CancellationToken cancellationToken = default)
        {
            var options = new CustomerUpdateOptions
            {
                InvoiceSettings = new CustomerInvoiceSettingsOptions
                {
                    DefaultPaymentMethod = paymentMethodId,
                },
            };
            await _customerService.UpdateAsync(customerId, options, cancellationToken: cancellationToken);
        }

        public async Task<PaymentIntent> CreatePaymentIntentAsync(long amount, string currency, string customerId, CancellationToken cancellationToken = default)
        {
            var customer = await _customerService.GetAsync(customerId, cancellationToken: cancellationToken);
            var defaultPaymentMethodId = customer?.InvoiceSettings?.DefaultPaymentMethodId;

            if (string.IsNullOrEmpty(defaultPaymentMethodId))
            {
                var paymentMethods = await GetPaymentMethodsAsync(customerId, cancellationToken);
                defaultPaymentMethodId = paymentMethods.Data.FirstOrDefault()?.Id;

                if (string.IsNullOrEmpty(defaultPaymentMethodId))
                {
                    throw new InvalidOperationException("This customer does not have a saved payment method to charge.");
                }
            }

            var options = new PaymentIntentCreateOptions
            {
                Amount = amount,
                Currency = currency,
                Customer = customerId,
                PaymentMethod = defaultPaymentMethodId,
                Confirm = true,
                OffSession = false,
            };

            return await _paymentIntentService.CreateAsync(options, cancellationToken: cancellationToken);
        }

        public async Task<PaymentIntent> CreateTestPaymentIntentAsync(long amount, string currency, string customerId, CancellationToken cancellationToken = default)
        {
            // For test mode, we'll create a payment intent that simulates a successful payment
            // This will be used with the user's account balance instead of real Stripe charges
            var options = new PaymentIntentCreateOptions
            {
                Amount = amount,
                Currency = currency,
                Customer = customerId,
                PaymentMethodTypes = new List<string> { "card" },
                Confirm = false, // Don't confirm immediately, just create the intent
                OffSession = false,
                Metadata = new Dictionary<string, string>
                {
                    { "TestMode", "true" },
                    { "PaymentType", "AccountBalance" }
                }
            };

            return await _paymentIntentService.CreateAsync(options, cancellationToken: cancellationToken);
        }

        public async Task<StripeList<PaymentMethod>> GetPaymentMethodsAsync(string customerId, CancellationToken cancellationToken = default)
        {
            var options = new PaymentMethodListOptions
            {
                Customer = customerId,
                Type = "card",
            };
            return await _paymentMethodService.ListAsync(options, cancellationToken: cancellationToken);
        }

        public string GetPublishableKey()
        {
            return _publishableKey;
        }
    }
}