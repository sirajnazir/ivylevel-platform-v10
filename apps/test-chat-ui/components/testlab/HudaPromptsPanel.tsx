"use client";

import { useState } from "react";
import {
  HUDA_PROMPTS,
  PROMPTS_BY_CATEGORY,
  TEST_SUITES,
  getPromptById,
  getPromptsByIds,
  searchPrompts,
  type TestPrompt
} from "@/lib/testlab/huda-prompts";

interface HudaPromptsPanelProps {
  onRunSingle: (prompt: TestPrompt) => void;
  onRunBatch: (prompts: TestPrompt[], suiteName: string) => void;
  running: boolean;
}

export function HudaPromptsPanel({ onRunSingle, onRunBatch, running }: HudaPromptsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSuite, setSelectedSuite] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  // Filter prompts based on category and search
  const getFilteredPrompts = (): TestPrompt[] => {
    let prompts = selectedCategory === 'all'
      ? HUDA_PROMPTS
      : PROMPTS_BY_CATEGORY[selectedCategory as keyof typeof PROMPTS_BY_CATEGORY] || [];

    if (searchTerm) {
      prompts = searchPrompts(searchTerm);
    }

    return prompts;
  };

  const filteredPrompts = getFilteredPrompts();

  const handleTogglePrompt = (id: string) => {
    const newSelected = new Set(selectedPrompts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPrompts(newSelected);
  };

  const handleSelectAll = () => {
    const allIds = filteredPrompts.map(p => p.id);
    setSelectedPrompts(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedPrompts(new Set());
  };

  const handleRunSelected = () => {
    const prompts = Array.from(selectedPrompts)
      .map(id => getPromptById(id))
      .filter(Boolean) as TestPrompt[];

    if (prompts.length === 0) {
      alert('No prompts selected');
      return;
    }

    onRunBatch(prompts, `Custom Selection (${prompts.length} prompts)`);
  };

  const handleRunSuite = () => {
    if (!selectedSuite) {
      alert('Please select a test suite');
      return;
    }

    const suite = TEST_SUITES[selectedSuite as keyof typeof TEST_SUITES];
    const prompts = getPromptsByIds(suite.prompts);

    onRunBatch(prompts, suite.name);
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      factual: 'bg-blue-100 text-blue-800',
      strategic: 'bg-purple-100 text-purple-800',
      emotional: 'bg-pink-100 text-pink-800',
      hybrid: 'bg-green-100 text-green-800',
      complex: 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Huda's Test Prompts</h2>
        <p className="text-sm text-gray-600 mt-1">
          {HUDA_PROMPTS.length} diverse prompts for comprehensive testing
        </p>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search prompts by content, description, or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Category
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({HUDA_PROMPTS.length})
          </button>
          {Object.entries(PROMPTS_BY_CATEGORY).map(([category, prompts]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-gray-900 text-white'
                  : `${getCategoryBadge(category)} hover:opacity-80`
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)} ({prompts.length})
            </button>
          ))}
        </div>
      </div>

      {/* Test Suites */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preset Test Suites
        </label>
        <select
          value={selectedSuite}
          onChange={(e) => setSelectedSuite(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select a suite...</option>
          {Object.entries(TEST_SUITES).map(([id, suite]) => (
            <option key={id} value={id}>
              {suite.name} - {suite.description} ({suite.prompts.length} tests)
            </option>
          ))}
        </select>
        <button
          onClick={handleRunSuite}
          disabled={!selectedSuite || running}
          className="mt-2 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {running ? 'Running...' : `Run ${selectedSuite ? TEST_SUITES[selectedSuite as keyof typeof TEST_SUITES]?.name : 'Suite'}`}
        </button>
      </div>

      {/* Batch Actions */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">
            {selectedPrompts.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>
        <button
          onClick={handleRunSelected}
          disabled={selectedPrompts.size === 0 || running}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {running ? 'Running...' : `Run Selected (${selectedPrompts.size})`}
        </button>
      </div>

      {/* Prompts List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <div className="text-sm font-medium text-gray-700 mb-2">
          {filteredPrompts.length} prompts
        </div>
        {filteredPrompts.map((prompt) => (
          <div
            key={prompt.id}
            className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedPrompts.has(prompt.id)}
                onChange={() => handleTogglePrompt(prompt.id)}
                className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryBadge(prompt.category)}`}>
                    {prompt.category}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {prompt.id}
                  </span>
                  <div className="flex gap-1 ml-auto">
                    {prompt.expected_cats.map((cat) => (
                      <span
                        key={cat}
                        className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  className="text-sm text-gray-900 mb-1 cursor-pointer hover:text-purple-600"
                  onClick={() => setExpandedPrompt(expandedPrompt === prompt.id ? null : prompt.id)}
                >
                  "{prompt.prompt}"
                </div>

                {expandedPrompt === prompt.id && (
                  <div className="mt-2 space-y-2 text-xs">
                    <div className="text-gray-600">
                      <span className="font-medium">Description:</span> {prompt.description}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {prompt.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Run Button */}
                <div className="mt-2">
                  <button
                    onClick={() => onRunSingle(prompt)}
                    disabled={running}
                    className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {running ? 'Running...' : 'Test Single'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Footer */}
      <div className="border-t pt-4 text-xs text-gray-600 space-y-1">
        <div>Total Prompts: {HUDA_PROMPTS.length}</div>
        <div>
          By Category: Factual ({PROMPTS_BY_CATEGORY.factual.length}) •
          Strategic ({PROMPTS_BY_CATEGORY.strategic.length}) •
          Emotional ({PROMPTS_BY_CATEGORY.emotional.length}) •
          Hybrid ({PROMPTS_BY_CATEGORY.hybrid.length}) •
          Complex ({PROMPTS_BY_CATEGORY.complex.length})
        </div>
        <div>Test Suites: {Object.keys(TEST_SUITES).length} presets available</div>
      </div>
    </div>
  );
}
