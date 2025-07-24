
using Microsoft.EntityFrameworkCore;

namespace Raqmiya.Infrastructure
{
    public class UserRepository : IUserRepository
    {
        private readonly RaqmiyaDbContext _context;

        public UserRepository(RaqmiyaDbContext context)
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

        public Task<bool> RegisterAsync(string email, string username, string password, string role)
        {
            throw new NotImplementedException();
        }

        public Task<bool> LoginAsync(string username, string password)
        {
            throw new NotImplementedException();
        }

        public string HashPassword(string password, string salt)
        {
            throw new NotImplementedException();
        }

        public Task<bool> UserExistsByEmailAsync(string email)
        {
            throw new NotImplementedException();
        }

        public Task<User> GetUserByEmailOrUsernameAsync(string emailOrUsername)
        {
            throw new NotImplementedException();
        }

        public Task AddAsync(User newUser)
        {
            throw new NotImplementedException();
        }

        public Task<bool> UserExistsByUsernameAsync(string username)
        {
            throw new NotImplementedException();
        }

        public Task<User?> GetByIdAsync(int id)
        {
            throw new NotImplementedException();
        }

        public Task<User?> GetUserByEmailAsync(string email)
        {
            throw new NotImplementedException();
        }

        public Task<User?> GetUserByUsernameAsync(string username)
        {
            throw new NotImplementedException();
        }

        public Task UpdateAsync(User user)
        {
            throw new NotImplementedException();
        }
    }
}
