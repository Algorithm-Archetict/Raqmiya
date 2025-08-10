using Microsoft.AspNetCore.Mvc;
using Shared.DTOs.CategoryDTOs;
using Raqmiya.Infrastructure;
using System.Threading.Tasks;
using System.Collections.Generic;
using API.Constants;
using Shared.Constants;
using AutoMapper;
using Core.Interfaces;
using Shared.DTOs.ProductDTOs;

namespace API.Controllers
{
    /// <summary>
    /// Controller for managing categories.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class CategoryController : ControllerBase
    {
        private readonly ICategoryRepository _categoryRepository;
        private readonly IProductService _productService;
        private readonly ILogger<CategoryController> _logger;
        private readonly IMapper _mapper;

        public CategoryController(ICategoryRepository categoryRepository, IProductService productService, ILogger<CategoryController> logger, IMapper mapper)
        {
            _categoryRepository = categoryRepository;
            _productService = productService;
            _logger = logger;
            _mapper = mapper;
        }

        /// <summary>
        /// Get all categories.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<GeneralCategoryDTO>), 200)]
        public async Task<IActionResult> GetAll()
        {
            var categories = await _categoryRepository.GetAllCategoriesAsync();
            var result = _mapper.Map<IEnumerable<GeneralCategoryDTO>>(categories);
            return Ok(result);
        }

        /// <summary>
        /// Get categories in hierarchical structure (tree format).
        /// </summary>
        [HttpGet("hierarchy")]
        [ProducesResponseType(typeof(IEnumerable<GeneralCategoryDTO>), 200)]
        public async Task<IActionResult> GetHierarchy()
        {
            var categories = await _categoryRepository.GetCategoriesHierarchyAsync();
            var result = _mapper.Map<IEnumerable<GeneralCategoryDTO>>(categories);
            return Ok(result);
        }

        /// <summary>
        /// Get a category by ID.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(GeneralCategoryDTO), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetById(int id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null) return NotFound();
            return Ok(_mapper.Map<GeneralCategoryDTO>(category));
        }

        /// <summary>
        /// Get products by specific category ID only (not including nested categories).
        /// </summary>
        [HttpGet("{id}/products")]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetCategoryProducts(int id, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            // Check if category exists
            if (!await _categoryRepository.ExistsAsync(id))
            {
                return NotFound("Category not found");
            }

            var products = await _productService.GetProductsByCategoryAsync(id, pageNumber, pageSize);
            return Ok(products);
        }

        /// <summary>
        /// Get products by category ID including all nested subcategories.
        /// </summary>
        [HttpGet("{id}/products/include-nested")]
        [ProducesResponseType(typeof(PagedResultDTO<ProductListItemDTO>), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetCategoryProductsIncludeNested(int id, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            // Check if category exists
            if (!await _categoryRepository.ExistsAsync(id))
            {
                return NotFound("Category not found");
            }

            // Get all nested category IDs
            var categoryIds = await _categoryRepository.GetAllNestedCategoryIdsAsync(id);
            
            var products = await _productService.GetProductsByMultipleCategoriesAsync(categoryIds, pageNumber, pageSize);
            return Ok(products);
        }

        /// <summary>
        /// Get child categories of a specific parent category.
        /// </summary>
        [HttpGet("{id}/children")]
        [ProducesResponseType(typeof(IEnumerable<GeneralCategoryDTO>), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetChildCategories(int id)
        {
            // Check if category exists
            if (!await _categoryRepository.ExistsAsync(id))
            {
                return NotFound("Category not found");
            }

            var childCategories = await _categoryRepository.GetChildCategoriesAsync(id);
            var result = _mapper.Map<IEnumerable<GeneralCategoryDTO>>(childCategories);
            return Ok(result);
        }

        /// <summary>
        /// Create a new category.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(GeneralCategoryDTO), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Create([FromBody] CategoryCreateUpdateDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var category = _mapper.Map<Category>(dto);
            await _categoryRepository.AddAsync(category);
            return CreatedAtAction(nameof(GetById), new { id = category.Id }, _mapper.Map<GeneralCategoryDTO>(category));
        }

        /// <summary>
        /// Update an existing category.
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(GeneralCategoryDTO), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Update(int id, [FromBody] CategoryCreateUpdateDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null) return NotFound();
            _mapper.Map(dto, category);
            await _categoryRepository.UpdateAsync(category);
            return Ok(_mapper.Map<GeneralCategoryDTO>(category));
        }

        /// <summary>
        /// Delete a category by ID.
        /// </summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Delete(int id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null) return NotFound();
            await _categoryRepository.DeleteAsync(category);
            return NoContent();
        }
    }
}
