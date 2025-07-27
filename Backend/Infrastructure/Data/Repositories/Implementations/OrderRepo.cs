
using Microsoft.EntityFrameworkCore;
using System;

namespace Raqmiya.Infrastructure
{
    public class OrderRepo : IOrder
    {
        private readonly RaqmiyaDbContext _context;

        public OrderRepo(RaqmiyaDbContext context)
        {
            _context = context;
        }
        public Order GetById(int id) => _context.Orders.Find(id);

        public IEnumerable<Order> GetAll() => _context.Orders.ToList();

        public IEnumerable<Order> GetByBuyerId(int buyerId) =>
            _context.Orders.Where(o => o.BuyerId == buyerId).ToList();

        public IEnumerable<Order> GetByEmail(string email) =>
            _context.Orders.Where(o => o.GuestEmail == email).ToList();

        public void Add(Order order) => _context.Orders.Add(order);

        public void Update(Order order) => _context.Orders.Update(order);

        public void Delete(int id)
        {
            var order = GetById(id);
            if (order != null)
                _context.Orders.Remove(order);
        }

        public void SaveChanges() => _context.SaveChanges();
    }
}
