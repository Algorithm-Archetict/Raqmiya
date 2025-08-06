using AutoMapper;
using Raqmiya.Infrastructure;
using Shared.DTOs.OrderDTOs;

namespace Core.Mapping_Profiles
{
    public class OrderMappingProfile : Profile
    {
        public OrderMappingProfile()
        {
            CreateMap<Order, OrderDTO>();
            CreateMap<OrderItem, OrderItemDTO>();
            CreateMap<OrderCreateDTO, Order>()
                .ForMember(dest => dest.OrderItems, opt => opt.MapFrom(src => src.items));
            CreateMap<OrderItemCreateDTO, OrderItem>();
            CreateMap<OrderUpdateDTO, Order>();
        }
    }
}

