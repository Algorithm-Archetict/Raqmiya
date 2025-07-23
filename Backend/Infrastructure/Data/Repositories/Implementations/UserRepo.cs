
using ITI_Raqmiya_MVC.Repository.Repository_Interface;
using Microsoft.EntityFrameworkCore;

namespace Raqmiya.Infrastructure
{
    public class UserRepo : IUserRepo
    {
        private readonly RaqmiyaDbContext _context;

        public UserRepo(RaqmiyaDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public User GetById(int id) => _context.Users.Find(id);

        public IEnumerable<User> GetAll() => _context.Users.ToList();

        public void Add(User user) => _context.Users.Add(user);

        public void Update(User user) => _context.Users.Update(user);

        public void Delete(int id)
        {
            var user = GetById(id);
            if (user != null)
                _context.Users.Remove(user);
        }

        public void SaveChanges() => _context.SaveChanges();

        public User GetByEmail(string email)
        {
            throw new NotImplementedException();
        }

        public User GetByUsername(string username)
        {
            throw new NotImplementedException();
        }

        public bool EmailExists(string email)
        {
            throw new NotImplementedException();
        }

        public bool UsernameExists(string username)
        {
            throw new NotImplementedException();
        }
    }
}
