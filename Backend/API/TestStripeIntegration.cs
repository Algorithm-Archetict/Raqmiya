using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Core.Interfaces;
using Stripe;

namespace API
{
    public class TestStripeIntegration
    {
        public static async Task TestStripeService()
        {
            try
            {
                Console.WriteLine("🧪 Testing Stripe Integration...");
                
                // Test configuration loading
                var configuration = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.json", optional: false)
                    .Build();

                var stripeSecretKey = configuration["Stripe:SecretKey"];
                var stripePublishableKey = configuration["Stripe:PublishableKey"];

                Console.WriteLine($"✅ Stripe Secret Key: {(string.IsNullOrEmpty(stripeSecretKey) ? "❌ NOT FOUND" : "✅ FOUND")}");
                Console.WriteLine($"✅ Stripe Publishable Key: {(string.IsNullOrEmpty(stripePublishableKey) ? "❌ NOT FOUND" : "✅ FOUND")}");

                if (string.IsNullOrEmpty(stripeSecretKey) || string.IsNullOrEmpty(stripePublishableKey))
                {
                    Console.WriteLine("❌ Stripe keys not configured. Please update appsettings.json");
                    return;
                }

                // Test Stripe API connection
                StripeConfiguration.ApiKey = stripeSecretKey;
                
                try
                {
                    var customerService = new Stripe.CustomerService();
                    var testCustomer = await customerService.CreateAsync(new Stripe.CustomerCreateOptions
                    {
                        Email = "test@example.com",
                        Description = "Test customer for integration verification"
                    });

                    Console.WriteLine($"✅ Stripe API connection successful!");
                    Console.WriteLine($"✅ Test customer created with ID: {testCustomer.Id}");

                    // Clean up test customer
                    await customerService.DeleteAsync(testCustomer.Id);
                    Console.WriteLine($"✅ Test customer cleaned up");

                    // Test payment method creation
                    var paymentMethodService = new Stripe.PaymentMethodService();
                    var testPaymentMethod = await paymentMethodService.CreateAsync(new Stripe.PaymentMethodCreateOptions
                    {
                        Type = "card",
                        Card = new Stripe.PaymentMethodCardOptions
                        {
                            Number = "4242424242424242",
                            ExpMonth = 12,
                            ExpYear = 2025,
                            Cvc = "123"
                        }
                    });

                    Console.WriteLine($"✅ Test payment method created with ID: {testPaymentMethod.Id}");

                    // Clean up test payment method
                    await paymentMethodService.DetachAsync(testPaymentMethod.Id);
                    Console.WriteLine($"✅ Test payment method cleaned up");

                    Console.WriteLine("\n🎉 All Stripe integration tests passed!");
                    Console.WriteLine("\n📋 Next steps:");
                    Console.WriteLine("1. Start the backend API: dotnet run");
                    Console.WriteLine("2. Start the frontend: ng serve");
                    Console.WriteLine("3. Navigate to Settings → Payment");
                    Console.WriteLine("4. Test with card: 4242 4242 4242 4242");
                }
                catch (StripeException ex)
                {
                    Console.WriteLine($"❌ Stripe API error: {ex.Message}");
                    Console.WriteLine($"Error type: {ex.StripeError?.Type}");
                    Console.WriteLine($"Error code: {ex.StripeError?.Code}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Test failed with error: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
            }
        }
    }
}
