using Stripe;
using System.Threading;
using System.Threading.Tasks;

namespace Core.Interfaces
{
    public interface IStripeService
    {
        /// <summary>
        /// Creates a new Stripe Customer for a given user.
        /// </summary>
        /// <param name="user">The internal user object.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>The created Stripe <see cref="Customer"/> object.</returns>
        Task<Customer> CreateCustomerAsync(Raqmiya.Infrastructure.User user, CancellationToken cancellationToken = default);

        /// <summary>
        /// Attaches a Stripe PaymentMethod to a Stripe Customer.
        /// </summary>
        /// <param name="paymentMethodId">The ID of the payment method to attach.</param>
        /// <param name="customerId">The ID of the customer.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>The attached Stripe <see cref="PaymentMethod"/> object.</returns>
        Task<PaymentMethod> AttachPaymentMethodAsync(string paymentMethodId, string customerId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Sets the default payment method for a Stripe Customer.
        /// </summary>
        /// <param name="paymentMethodId">The ID of the payment method to set as default.</param>
        /// <param name="customerId">The ID of the customer.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        Task SetDefaultPaymentMethodAsync(string paymentMethodId, string customerId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Creates a Stripe PaymentIntent to process a payment.
        /// </summary>
        /// <param name="amount">The amount to charge in the smallest currency unit (e.g., cents).</param>
        /// <param name="currency">The currency code (e.g., "usd").</param>
        /// <param name="customerId">The ID of the customer making the payment.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>The created Stripe <see cref="PaymentIntent"/> object.</returns>
        Task<PaymentIntent> CreatePaymentIntentAsync(long amount, string currency, string customerId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieves a list of payment methods for a customer.
        /// </summary>
        /// <param name="customerId">The customer's Stripe ID.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>A list of <see cref="PaymentMethod"/> objects.</returns>
        Task<StripeList<PaymentMethod>> GetPaymentMethodsAsync(string customerId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Creates a payment intent for testing purposes using the user's account balance.
        /// </summary>
        /// <param name="amount">The amount to charge in cents.</param>
        /// <param name="currency">The currency code.</param>
        /// <param name="customerId">The Stripe customer ID.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>The created payment intent.</returns>
        Task<PaymentIntent> CreateTestPaymentIntentAsync(long amount, string currency, string customerId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets the publishable key for frontend Stripe integration.
        /// </summary>
        /// <returns>The Stripe publishable key.</returns>
        string GetPublishableKey();
    }
}