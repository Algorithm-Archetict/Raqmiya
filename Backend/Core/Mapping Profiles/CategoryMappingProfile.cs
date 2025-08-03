using AutoMapper;
using Raqmiya.Infrastructure;
using Shared.DTOs.CategoryDTOs;

namespace Core.Mapping_Profiles
{
    public class CategoryMappingProfile : Profile
    {
        public CategoryMappingProfile()
        {
            CreateMap<Category, CategoryDTO>();
            CreateMap<CategoryCreateUpdateDTO, Category>();
        }
    }
}

