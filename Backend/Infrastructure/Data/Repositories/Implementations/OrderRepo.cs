using ITI_Raqmiya_MVC.Data;
using ITI_Raqmiya_MVC.Models;
using ITI_Raqmiya_MVC.Repository.Repository_Interface;
using Microsoft.EntityFrameworkCore;
using System;

namespace ITI_Raqmiya_MVC.Repository.Repos_Implementation
{
    public class OrderRepo : IOrder
    {
        private readonly RaqmiyaContext _context;

        public OrderRepo(RaqmiyaContext context)
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
