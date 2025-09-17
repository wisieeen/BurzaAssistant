# Panel Settings Feature

## Overview
The LLMSummaryPanel now includes a cog icon (⚙️) that allows users to modify LLM model and prompt settings directly from the panel interface, without needing to navigate to the main Settings panel.

## Features

### Cog Icon Button
- **Location**: Top-right corner of the LLMSummaryPanel header
- **Icon**: Settings (⚙️) from Lucide React
- **Positioning**: Placed after the action buttons (Copy, Download, Clear) with proper spacing

### Panel Settings Menu
- **Component**: `PanelSettingsMenu` - a modal dialog that appears when the cog icon is clicked
- **Content**: Focused settings for the LLM Summary functionality
- **Modal Behavior**: Full-screen overlay with centered content, proper z-index layering

### Available Settings

#### 1. Summary Analysis Model
- **Purpose**: Select which Ollama model to use for transcript analysis
- **Options**: 
  - None (Disabled) - Skip processing
  - Llama 3.2 Uncensored (default)
  - Llama 2
  - Mistral
  - Code Llama
  - Any other models available from the backend
- **Features**: 
  - Refresh button to reload available models
  - Model descriptions and sizes
  - Fallback to localStorage if backend unavailable

#### 2. Analysis Prompt
- **Purpose**: Customize the prompt template used for LLM analysis
- **Template Variable**: `{transcript}` placeholder for transcript text
- **Default**: Comprehensive analysis prompt covering topics, key points, questions, and sentiment
- **Features**: 
  - Multi-line textarea with proper sizing
  - Placeholder text guidance
  - Real-time editing

### Technical Implementation

#### State Management
- **Local State**: `isSettingsOpen` controls modal visibility
- **Settings State**: Managed within PanelSettingsMenu component
- **Backend Sync**: Automatically loads and saves to backend API
- **Fallback**: localStorage backup if backend unavailable

#### API Integration
- **Load Settings**: `GET /api/settings/` on modal open
- **Save Settings**: `POST /api/settings/` with model and prompt data
- **Model Discovery**: `GET /llm/models` for available Ollama models
- **Error Handling**: Graceful fallbacks and user feedback

#### UI Components Used
- **Modal**: Fixed positioning with backdrop overlay
- **Cards**: Organized sections for different setting types
- **Buttons**: Consistent styling with proper variants
- **Badges**: Status indicators for save operations
- **Form Controls**: Select dropdowns and textareas

### User Experience

#### Opening Settings
1. Click the cog icon (⚙️) in the LLMSummaryPanel header
2. Modal appears with current settings loaded
3. Settings are automatically fetched from backend

#### Modifying Settings
1. Change model selection from dropdown
2. Edit prompt template in textarea
3. Use refresh button to reload available models
4. See real-time status updates via badges

#### Saving Changes
1. Click "Save Settings" button
2. Settings are sent to backend API
3. Success/error feedback via status badge
4. Modal can be closed after successful save

#### Closing Settings
1. Click "Cancel" button to discard changes
2. Click "X" button in top-right corner
3. Click outside modal area
4. Settings are preserved if not saved

### Integration Points

#### Parent Component Communication
- **onSettingsChange**: Callback when settings are modified
- **State Synchronization**: Settings changes are immediately available
- **Error Handling**: Parent can respond to settings failures

#### Backend Compatibility
- **API Endpoints**: Uses existing settings API structure
- **Data Format**: Compatible with main SettingsPanel
- **Authentication**: Inherits current session/auth state

#### Local Storage
- **Backup Strategy**: Settings cached locally for offline use
- **Conflict Resolution**: Backend settings take precedence
- **Persistence**: Survives browser restarts

## Future Enhancements

### Potential Additions
- **Model Testing**: Test button to verify model connectivity
- **Prompt Templates**: Library of pre-built prompt templates
- **Settings Export/Import**: Share settings between users
- **Real-time Validation**: Prompt syntax checking
- **Performance Metrics**: Model response time tracking

### UI Improvements
- **Keyboard Shortcuts**: Ctrl+S to save, Esc to close
- **Drag & Drop**: Reorder prompt sections
- **Syntax Highlighting**: Markdown support in prompts
- **Responsive Design**: Better mobile experience

## Troubleshooting

### Common Issues
1. **Settings Not Loading**: Check backend connectivity and API endpoints
2. **Models Not Refreshing**: Verify Ollama service is running
3. **Save Failures**: Check backend logs and network connectivity
4. **Modal Not Opening**: Verify component imports and state management

### Debug Information
- Console logs for settings operations
- Network tab for API request/response details
- Component state inspection via React DevTools
- Backend API endpoint testing

## Code Structure

### Files Modified
- `LLMSummaryPanel.tsx` - Added cog icon and settings integration
- `PanelSettingsMenu.tsx` - New component for settings management
- `panels/index.ts` - Export for PanelSettingsMenu

### Key Functions
- `handleSettingChange()` - Manages local state updates
- `loadSettingsFromBackend()` - Fetches current settings
- `handleSaveSettings()` - Persists changes to backend
- `loadAvailableOllamaModels()` - Discovers available models

### State Variables
- `isSettingsOpen` - Modal visibility control
- `settings` - Current settings values
- `saveStatus` - Operation status tracking
- `availableOllamaModels` - Model discovery cache
