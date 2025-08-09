using FluentValidation;

namespace Shared.DTOs.OrderDTOs
{
    public class OrderCreateDTOValidator : AbstractValidator<OrderCreateDTO>
    {
        public OrderCreateDTOValidator()
        {
            RuleFor(x => x.Items)
                .NotEmpty().WithMessage("Order must have at least one item.");
            RuleForEach(x => x.Items).SetValidator(new OrderItemCreateDTOValidator());
        }
    }

    public class OrderItemCreateDTOValidator : AbstractValidator<OrderItemCreateDTO>
    {
        public OrderItemCreateDTOValidator()
        {
            RuleFor(x => x.ProductId).GreaterThan(0);
            RuleFor(x => x.Quantity).GreaterThan(0);
        }
    }

    public class OrderUpdateDTOValidator : AbstractValidator<OrderUpdateDTO>
    {
        public OrderUpdateDTOValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0);
            RuleFor(x => x.Status).NotEmpty();
        }
    }
}
