using FluentValidation;

namespace Shared.DTOs.CategoryDTOs
{
    public class CategoryCreateUpdateDTOValidator : AbstractValidator<CategoryCreateUpdateDTO>
    {
        public CategoryCreateUpdateDTOValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Name is required.")
                .Length(2, 100).WithMessage("Name must be between 2 and 100 characters.");

            RuleFor(x => x.Description)
                .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.");

        }
    }
}

