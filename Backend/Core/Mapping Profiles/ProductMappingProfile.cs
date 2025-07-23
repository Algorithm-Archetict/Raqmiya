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
            // Map from Product entity to ProductListItemDTO
            CreateMap<Product, ProductListItemDTO>()
                // Custom mapping for the CreatorUsername property
                // This tells AutoMapper to get the username from the nested Creator object
                .ForMember(dest => dest.CreatorUsername, opt => opt.MapFrom(src => src.Creator.Username));

            // You can also create mappings for other DTOs like ProductCreateRequestDTO
            // CreateMap<ProductCreateRequestDTO, Product>();

            // And for update operations
            // CreateMap<ProductUpdateRequestDTO, Product>();
        }
    }
}
