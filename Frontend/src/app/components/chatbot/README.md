# AI Chatbot Component

## Overview
The AI Chatbot component provides a sticky floating chat interface that appears on all pages of the Raqmiya application. It includes advanced features like RAG (Retrieval-Augmented Generation), image analysis, and admin-only knowledge base management.

## Features

### For All Users:
- **Text Chat**: Natural language conversations with AI
- **Image Analysis**: Upload and analyze images using GPT-4o Vision
- **File Upload**: Upload text files for analysis
- **Chat History**: Persistent chat history across sessions
- **Markdown Support**: Rich text formatting in responses

### For Admin Users Only:
- **Knowledge Base Management**: Upload, view, and delete documents
- **RAG System**: AI uses uploaded documents to provide contextual answers
- **Admin Commands**: Special commands for knowledge base management

## Usage

### Regular Users:
1. Click the floating chat button (bottom-right corner)
2. Type your message and press Enter or click Send
3. Upload images or files using the attachment buttons
4. Get AI responses with contextual information from knowledge base

### Admin Users:
1. Login as admin user
2. Access admin panel via gear icon in chat header
3. Upload documents to knowledge base
4. Use admin commands:
   - `admin: add document` - Upload new document
   - `admin: list documents` - View all documents
   - `admin: delete document [name]` - Delete document
   - `admin: search documents [query]` - Search content

## Setup

### 1. API Key Configuration
Replace `YOUR_OPENAI_API_KEY_HERE` in `chatbot.service.ts` with your actual OpenAI API key:

```typescript
private readonly apiKey = 'sk-your-actual-api-key-here';
```

### 2. Admin Role Configuration
Ensure your auth service returns the correct role for admin users. The component checks for:
```typescript
currentUser?.role === 'Admin'
```

### 3. Knowledge Base Documents
Admin users can upload text files (.txt, .md, .doc, .docx) to the knowledge base. These documents will be:
- Processed into embeddings
- Stored in localStorage
- Used to provide contextual responses

## File Structure
```
Frontend/src/app/components/chatbot/
├── chatbot.component.ts      # Main component logic
├── chatbot.component.html    # Template
├── chatbot.component.css     # Styling
└── README.md               # This file
```

## Styling
The component uses a dark theme with gradients matching the AI Feature design:
- Background: Dark gradient (#232526 to #414345)
- Primary: Purple to blue gradient (#6a11cb to #2575fc)
- Accent: Green gradient (#43cea2 to #185a9d)

## Responsive Design
- Desktop: 400x500px modal
- Mobile: Full-width modal with adjusted sizing
- Sticky button adapts to screen size

## Security
- Admin-only access to knowledge base management
- Role-based UI rendering
- Secure API communication with OpenAI
- Local storage for chat history and knowledge base

## Troubleshooting

### Common Issues:
1. **API Key Error**: Ensure OpenAI API key is correctly set
2. **Admin Access**: Verify user role is 'Admin' for admin features
3. **File Upload**: Check file size limits (10MB for files, 5MB for images)
4. **Responsive Issues**: Test on different screen sizes

### Debug Commands:
- Check browser console for API errors
- Verify localStorage for chat history and knowledge base
- Test admin commands in chat interface
