using AutoMapper;
using Raqmiya.Infrastructure;
using Shared.DTOs.ProductDTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core.Mapping_Profiles
{
    public class ProductMappingProfile : Profile
    {
        public ProductMappingProfile()
        {
            CreateMap<Product, ProductListItemDTO>()
                .ForMember(dest => dest.CreatorUsername, opt => opt.MapFrom(src => src.Creator.Username))
                .ForMember(dest => dest.Category, opt => opt.MapFrom(src => src.Category));

            CreateMap<Product, ProductDetailDTO>()
                .ForMember(dest => dest.CreatorUsername, opt => opt.MapFrom(src => src.Creator.Username))
                .ForMember(dest => dest.Category, opt => opt.MapFrom(src => src.Category))
                .ForMember(dest => dest.Tags, opt => opt.MapFrom(src => src.ProductTags.Select(pt => pt.Tag).ToList()));

            CreateMap<ProductCreateRequestDTO, Product>()
                .ForMember(dest => dest.ProductTags, opt => opt.Ignore()); // Tags are handled separately

            CreateMap<ProductUpdateRequestDTO, Product>()
                .ForMember(dest => dest.ProductTags, opt => opt.Ignore()); // Tags are handled separately
        }
    }
}
