#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// Codebase Health Map — Interactive visualization of active code
// paths, unused files, and cleanup candidates.
//
// Usage:  node scripts/code-paths.mjs
// Output: code-paths.html (open in any browser)
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();

// ───────────────────────────────────────────────
// Configuration: Human-readable cluster names
// ───────────────────────────────────────────────

function clusterForTS(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (rel.startsWith('src/server/routes/'))     return { id: 'ts-routes',     label: 'API Routes',      zone: 'server' };
  if (rel.startsWith('src/server/services/'))    return { id: 'ts-services',   label: 'Services',         zone: 'server' };
  if (rel.startsWith('src/server/db/'))          return { id: 'ts-database',   label: 'Database',         zone: 'server' };
  if (rel.startsWith('src/server/middleware/'))   return { id: 'ts-security',   label: 'Auth & Security',  zone: 'server' };
  if (rel.startsWith('src/server/data/'))        return { id: 'ts-data',       label: 'Reference Data',   zone: 'server' };
  if (rel.startsWith('src/server/'))             return { id: 'ts-server',     label: 'Server Core',      zone: 'server' };
  if (rel.startsWith('src/client/components/'))  return { id: 'ts-components', label: 'UI Components',    zone: 'client' };
  if (rel.startsWith('src/client/hooks/'))       return { id: 'ts-hooks',      label: 'React Hooks',      zone: 'client' };
  if (rel.startsWith('src/client/lib/'))         return { id: 'ts-lib',        label: 'Client Core',      zone: 'client' };
  if (rel.startsWith('src/client/context/'))     return { id: 'ts-context',    label: 'Auth Context',     zone: 'client' };
  if (rel.startsWith('src/client/utils/'))       return { id: 'ts-utils',      label: 'Utilities',        zone: 'client' };
  if (rel.startsWith('src/client/'))             return { id: 'ts-client',     label: 'Client Entry',     zone: 'client' };
  if (rel.startsWith('src/shared/'))             return { id: 'ts-shared',     label: 'Shared Code',      zone: 'shared' };
  return { id: 'ts-other', label: 'Other', zone: 'other' };
}

function clusterForSwift(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const afterTrinity = rel.replace('ios/Trinity/', '');
  if (afterTrinity.startsWith('Features/AudioTour/'))          return { id: 'sw-audio',       label: 'Audio Tour',       zone: 'features' };
  if (afterTrinity.startsWith('Features/Auth/'))               return { id: 'sw-auth',        label: 'Authentication',   zone: 'features' };
  if (afterTrinity.startsWith('Features/ChatAssistant/'))      return { id: 'sw-chat',        label: 'Chat Assistant',   zone: 'features' };
  if (afterTrinity.startsWith('Features/Guidebook/Journal/'))  return { id: 'sw-journal-pg',  label: 'Journal Pages',    zone: 'features' };
  if (afterTrinity.startsWith('Features/Guidebook/Pages/'))    return { id: 'sw-guidebook-pg',label: 'Guidebook Pages',  zone: 'features' };
  if (afterTrinity.startsWith('Features/Guidebook/'))          return { id: 'sw-guidebook',   label: 'Guidebook Shell',  zone: 'features' };
  if (afterTrinity.startsWith('Features/NewTrip/'))            return { id: 'sw-newtrip',     label: 'Trip Creation',    zone: 'features' };
  if (afterTrinity.startsWith('Features/TripEditor/'))         return { id: 'sw-editor',      label: 'Trip Editor',      zone: 'features' };
  if (afterTrinity.startsWith('Features/TripList/'))           return { id: 'sw-triplist',    label: 'Trip List',        zone: 'features' };
  if (afterTrinity.startsWith('Features/Travelogues/'))        return { id: 'sw-travelogues', label: 'Travelogues',      zone: 'features' };
  if (afterTrinity.startsWith('Features/Photos/'))             return { id: 'sw-photos',      label: 'Photo Picker',     zone: 'features' };
  if (afterTrinity.startsWith('Features/JoinTrip/'))           return { id: 'sw-jointrip',    label: 'Trip Sharing',     zone: 'features' };
  if (afterTrinity.startsWith('Features/Journal/'))            return { id: 'sw-journal',     label: 'Journal',          zone: 'features' };
  if (afterTrinity.startsWith('Features/VoiceGuide/'))         return { id: 'sw-voiceguide',  label: 'Voice Guide',      zone: 'features' };
  if (afterTrinity.startsWith('Models/'))                      return { id: 'sw-models',      label: 'Data Models',      zone: 'core' };
  if (afterTrinity.startsWith('Services/'))                    return { id: 'sw-services',    label: 'Services',         zone: 'core' };
  if (afterTrinity.startsWith('Utilities/'))                   return { id: 'sw-utilities',   label: 'Utilities',        zone: 'core' };
  if (afterTrinity.startsWith('App/'))                         return { id: 'sw-app',         label: 'App Entry',        zone: 'core' };
  if (afterTrinity.startsWith('TrinityUITests/'))              return { id: 'sw-tests',       label: 'UI Tests',         zone: 'other' };
  return { id: 'sw-other', label: 'Other', zone: 'other' };
}

// Human-readable file labels (override map for non-obvious names)
const FILE_LABELS = {
  'claude.ts': 'AI Generation',
  'tts.ts': 'Text to Speech',
  'pdf.ts': 'PDF Export',
  'journalPdf.ts': 'Journal PDF',
  'lulu.ts': 'Print Fulfillment',
  'supabase.ts': 'Database Client',
  'carAudio.ts': 'Car Audio Tour',
  'unsplash.ts': 'Unsplash Images',
  'flickr.ts': 'Flickr Images',
  'googlePlaces.ts': 'Google Places',
  'routing.ts': 'Route Planning',
  'stripe.ts': 'Payments',
  'rateLimiter.ts': 'Rate Limiter',
  'enrichmentLimiter.ts': 'Enrichment Queue',
  'costTracker.ts': 'Cost Tracker',
  'imageSelector.ts': 'Image Picker',
  'photoMatcher.ts': 'Photo Matcher',
  'imageRevalidation.ts': 'Image Revalidation',
  'weather.ts': 'Weather Service',
  'cache.ts': 'Cache Layer',
  'travelerProfile.ts': 'Traveler Profile',
  'staticMap.ts': 'Static Maps',
  'mapboxSearch.ts': 'Mapbox Search',
  'tripadvisor.ts': 'TripAdvisor',
  'opencharge.ts': 'EV Chargers',
  'evRange.ts': 'EV Range Calculator',
  'editStaging.ts': 'Edit Staging',
  'tripMutations.ts': 'Trip Mutations',
  'inworldRealtime.ts': 'Inworld Realtime (deleted)',
  'oauth.ts': 'OAuth Provider',
  'pdfCache.ts': 'PDF Cache',
  'pdfUtils.ts': 'PDF Utilities',
  'index.ts': null, // handled by context
  'auth.ts': 'Auth Middleware',
  // Client
  'App.tsx': 'App Shell',
  'TripDocument.tsx': 'Trip Viewer',
  'TripForm.tsx': 'Trip Planner',
  'ChatAssistant.tsx': 'Chat Editor',
  'VoiceGuide.tsx': 'Voice Guide',
  'VoicePicker.tsx': 'Voice Picker',
  'LoadingState.tsx': 'Loading Screen',
  'TripOverviewEditor.tsx': 'Map Editor',
  'DayColumns.tsx': 'Day Columns',
  'OverviewMap.tsx': 'Overview Map',
  'DaySection.tsx': 'Day Page',
  'Stop.tsx': 'Stop Card',
  'LandingPage.tsx': 'Landing Page',
  'TripsPage.tsx': 'My Trips',
  'SharedTripView.tsx': 'Shared Trip',
  'TravelogueView.tsx': 'Travelogue View',
  'TraveloguesHub.tsx': 'Travelogues Hub',
  'CollectionPage.tsx': 'Collections',
  'GuidebookModal.tsx': 'Guidebook Preview',
  'JournalPreviewModal.tsx': 'Journal Preview',
  'PublishModal.tsx': 'Publish Modal',
  'PrintCheckoutModal.tsx': 'Print Checkout',
  'AuthContext.tsx': 'Auth State',
  'ProfileMenu.tsx': 'Profile Menu',
  'Auth.tsx': 'Sign In',
  'api.ts': 'API Client',
  'supabase.ts': null, // context dependent
  'analytics.ts': 'Analytics',
  'i18n.ts': 'Translations',
  'ImageEmptyState.tsx': 'Image Placeholder',
  // Swift
  'TrinityApp.swift': 'App Entry',
  'ContentView.swift': 'Root View',
  'LaunchScreen.swift': 'Launch Screen',
  'APIClient.swift': 'API Client',
  'AuthService.swift': 'Auth Service',
  'StoreService.swift': 'Subscriptions',
  'NarrationService.swift': 'Narration Player',
  'CarAudioService.swift': 'Car Audio',
  'GeofenceService.swift': 'Geofencing',
  'StorageService.swift': 'Cloud Storage',
  'ImageUploadService.swift': 'Image Upload',
  'DeepLinkService.swift': 'Deep Links',
  'UploadSyncService.swift': 'Upload Sync',
  'VideoExportService.swift': 'Video Export',
  'DeviceIdService.swift': 'Device ID',
  'WeatherCache.swift': 'Weather Cache',
  'Haptics.swift': 'Haptic Feedback',
  'Strings.swift': 'Localized Strings',
  'GuidebookView.swift': 'Guidebook Shell',
  'GuidebookStore.swift': 'Guidebook State',
  'CoverPage.swift': 'Cover Page',
  'ItineraryPage.swift': 'Itinerary Page',
  'StopPage.swift': 'Stop Page',
  'DayChapterPage.swift': 'Day Chapter',
  'DayMapPage.swift': 'Day Map',
  'DayNarrativePage.swift': 'Day Narrative',
  'BackCoverPage.swift': 'Back Cover',
  'TripEditorView.swift': 'Trip Editor',
  'TripEditorViewModel.swift': 'Editor Logic',
  'TripListView.swift': 'Trip List',
  'NewTripView.swift': 'New Trip Form',
  'TripGenerationView.swift': 'Generation Progress',
  'Trip.swift': 'Trip Model',
  'StoredTrip.swift': 'Stored Trip',
  'ChatAssistantView.swift': 'Chat View',
  'ChatViewModel.swift': 'Chat Logic',
};

function humanLabel(filePath) {
  const basename = path.basename(filePath);
  const override = FILE_LABELS[basename];
  if (override) return override;
  if (override === null) {
    // Context-dependent: use parent dir
    const dir = path.basename(path.dirname(filePath));
    return prettify(dir) + ' / ' + prettify(basename.replace(/\.(ts|tsx|swift)$/, ''));
  }
  return prettify(basename.replace(/\.(ts|tsx|swift)$/, ''));
}

function prettify(name) {
  // camelCase/PascalCase → words
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/^use\s/i, '') // strip "use" prefix from hooks
    .replace(/^\w/, c => c.toUpperCase());
}


// ───────────────────────────────────────────────
// Phase 1: Walk filesystem
// ───────────────────────────────────────────────

function walkDir(dir, extensions) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' ||
          entry.name === 'build' || entry.name === 'DerivedData' || entry.name === '.build' ||
          entry.name === 'xcuserdata' || entry.name === 'Trinity.xcarchive') continue;
      results.push(...walkDir(full, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

// ───────────────────────────────────────────────
// Phase 2: TypeScript analysis
// ───────────────────────────────────────────────

function cleanImportName(raw) {
  // Strip inline `type` keyword: import { type Foo, bar } → Foo, bar
  return raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
}

function extractNames(block) {
  // Strip comments, split by comma, clean each name
  return block
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(',')
    .map(cleanImportName)
    .filter(Boolean);
}

function parseTSFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = [];
  const importedNames = {}; // importPath → [names]  (merged, not overwritten)
  const exports = [];
  const reExportMap = {};   // exportName → { from: importPath } — tracks re-export chains
  const loc = content.split('\n').length;

  function addImportedNames(importPath, names) {
    if (!importedNames[importPath]) importedNames[importPath] = [];
    importedNames[importPath].push(...names);
  }

  // Static imports: import { X } from './path.js'
  const staticRe = /import\s+(?:type\s+)?(?:\{([^}]*)\}|(\w+)(?:\s*,\s*\{([^}]*)\})?|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = staticRe.exec(content))) {
    const importPath = m[5];
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) continue;
    imports.push(importPath);
    const names = [];
    if (m[1]) names.push(...extractNames(m[1]));
    if (m[2]) names.push('default');
    if (m[3]) names.push(...extractNames(m[3]));
    if (m[4]) names.push('*');
    addImportedNames(importPath, names);
  }

  // Dynamic imports: import('./path') and import('./path').then(({ name }) => ...)
  // Pattern 1: import('./path').then(({ x, y }) => ...) — destructured names
  const dynamicThenRe = /import\(\s*['"]([^'"]+)['"]\s*\)\s*\.then\(\s*\(\s*\{([^}]*)\}\s*\)/g;
  while ((m = dynamicThenRe.exec(content))) {
    const importPath = m[1];
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) continue;
    imports.push(importPath);
    const names = extractNames(m[2]);
    addImportedNames(importPath, names.length > 0 ? names : ['default']);
  }
  // Pattern 2: bare import('./path') without .then — lazy/code-split
  const dynamicRe = /import\(\s*['"]([^'"]+)['"]\s*\)(?!\s*\.then)/g;
  while ((m = dynamicRe.exec(content))) {
    const importPath = m[1];
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) continue;
    imports.push(importPath);
    addImportedNames(importPath, ['default']);
  }

  // Re-exports: export { X } from './path.js'
  const reExportRe = /export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = reExportRe.exec(content))) {
    const importPath = m[2];
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) continue;
    imports.push(importPath);
    const names = extractNames(m[1]);
    addImportedNames(importPath, names);
    // Track re-export chain: this file re-exports these names from importPath
    for (const n of names) {
      exports.push(n);
      reExportMap[n] = importPath;
    }
  }

  // Named exports: export function/const/class/type/interface/enum X
  const namedExportRe = /export\s+(?:async\s+)?(?:function\s*\*?|const|let|var|class|type|interface|enum)\s+(\w+)/g;
  while ((m = namedExportRe.exec(content))) {
    exports.push(m[1]);
  }

  // Default export
  if (/export\s+default\b/.test(content)) {
    exports.push('default');
  }

  return { imports, importedNames, exports, reExportMap, loc };
}

function resolveImportPath(importPath, fromFile) {
  let resolved = importPath;

  // Handle @/ alias → src/
  if (resolved.startsWith('@/')) {
    resolved = resolved.replace('@/', 'src/');
  }

  // Handle relative paths
  if (resolved.startsWith('.')) {
    resolved = path.resolve(path.dirname(fromFile), resolved);
    resolved = path.relative(ROOT, resolved);
  }

  // Normalize: remove .js extension, try .ts/.tsx
  resolved = resolved.replace(/\.js$/, '');

  // Try direct matches
  const candidates = [
    path.join(ROOT, resolved + '.ts'),
    path.join(ROOT, resolved + '.tsx'),
    path.join(ROOT, resolved + '/index.ts'),
    path.join(ROOT, resolved + '/index.tsx'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// ───────────────────────────────────────────────
// Phase 3: Swift analysis
// ───────────────────────────────────────────────

// Common Swift/system types to ignore (they'd create false edges)
const SWIFT_IGNORE_TYPES = new Set([
  'String', 'Int', 'Double', 'Float', 'Bool', 'Array', 'Dictionary', 'Set',
  'Optional', 'Result', 'Error', 'URL', 'Data', 'Date', 'UUID', 'Void',
  'View', 'App', 'Scene', 'Body', 'State', 'Binding', 'Published',
  'ObservableObject', 'EnvironmentObject', 'Environment', 'StateObject',
  'Codable', 'Identifiable', 'Hashable', 'Equatable', 'Comparable',
  'Decodable', 'Encodable', 'CodingKeys', 'Text', 'Image', 'Button',
  'NavigationView', 'NavigationLink', 'List', 'VStack', 'HStack', 'ZStack',
  'Color', 'Font', 'CGFloat', 'CGPoint', 'CGSize', 'CGRect',
  'Task', 'AsyncSequence', 'AnyView', 'Group', 'ForEach', 'Section',
  'Alert', 'Sheet', 'LazyVGrid', 'LazyHGrid', 'ScrollView',
  'WindowGroup', 'ContentUnavailableView', 'ProgressView',
  'Notification', 'NotificationCenter', 'UserDefaults',
  'Timer', 'DispatchQueue', 'DispatchGroup', 'URLSession',
  'JSONDecoder', 'JSONEncoder', 'AVAudioSession', 'AVAudioEngine',
  'PHPickerViewController', 'UIImage', 'UIColor', 'NSObject',
  'Spacer', 'Divider', 'Label', 'Toggle', 'Slider', 'Picker',
  'GeometryReader', 'GeometryProxy', 'PreferenceKey',
  'Transaction', 'StoreKit', 'Product', 'Animation',
  'Shape', 'Path', 'Circle', 'Rectangle', 'RoundedRectangle',
  'AnyPublisher', 'PassthroughSubject', 'CurrentValueSubject',
  'Cancellable', 'AnyCancellable', 'Publisher',
  'MapKit', 'MKMapView', 'MKCoordinateRegion', 'CLLocationCoordinate2D',
  'UIViewController', 'UIViewRepresentable', 'UIViewControllerRepresentable',
]);

function parseSwiftFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const loc = content.split('\n').length;
  const defines = [];

  // Extract type definitions
  const typeRe = /(?:public\s+|open\s+|internal\s+|private\s+|fileprivate\s+)?(?:final\s+)?(?:class|struct|enum|protocol|typealias|actor)\s+(\w+)/g;
  let m;
  while ((m = typeRe.exec(content))) {
    const name = m[1];
    if (!SWIFT_IGNORE_TYPES.has(name) && name.length > 2) {
      defines.push(name);
    }
  }

  // Extract extension targets: extension TypeName
  const extRe = /extension\s+(\w+)/g;
  while ((m = extRe.exec(content))) {
    // Note: this file depends on the type it extends (if defined elsewhere)
  }

  return { defines, loc, content };
}

function buildSwiftReferences(files, typeMap) {
  // typeMap: typeName → definingFilePath
  const edges = []; // { from, to }

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Strip single-line comments to reduce false positives
    const stripped = content.replace(/\/\/.*$/gm, '');

    for (const [typeName, defFile] of Object.entries(typeMap)) {
      if (defFile === filePath) continue; // self-reference
      const re = new RegExp(`\\b${typeName}\\b`);
      if (re.test(stripped)) {
        edges.push({ from: filePath, to: defFile });
      }
    }
  }

  return edges;
}

function parsePbxproj(pbxprojPath) {
  if (!fs.existsSync(pbxprojPath)) return new Set();
  const content = fs.readFileSync(pbxprojPath, 'utf-8');
  const swiftFiles = new Set();
  // Match: /* FileName.swift in Sources */
  const re = /\/\*\s+(\S+\.swift)\s+in\s+Sources\s+\*\//g;
  let m;
  while ((m = re.exec(content))) {
    swiftFiles.add(m[1]);
  }
  return swiftFiles;
}


// ───────────────────────────────────────────────
// Phase 4: Git overlay
// ───────────────────────────────────────────────

function getGitChanges() {
  const changes = new Map(); // relativePath → status (M/A/D)
  try {
    const diff = execSync('git diff --name-status master -- src/ ios/Trinity/', { encoding: 'utf-8' });
    for (const line of diff.trim().split('\n').filter(Boolean)) {
      const [status, ...pathParts] = line.split('\t');
      const filePath = pathParts.join('\t');
      changes.set(filePath, status.charAt(0));
    }
  } catch {
    // If no master branch or git issue, try HEAD
    try {
      const status = execSync('git status --porcelain -u -- src/ ios/Trinity/', { encoding: 'utf-8' });
      for (const line of status.trim().split('\n').filter(Boolean)) {
        const st = line.substring(0, 2).trim();
        const filePath = line.substring(3).trim();
        changes.set(filePath, st === '??' ? 'A' : st.includes('D') ? 'D' : 'M');
      }
    } catch { /* ignore */ }
  }
  return changes;
}


// ───────────────────────────────────────────────
// Phase 5: Build TypeScript graph
// ───────────────────────────────────────────────

function isUsedInternally(content, name) {
  // Count how many times the name appears as a whole word.
  // The definition itself is one occurrence (export function X / export const X / etc).
  // Any additional occurrence = internal usage.
  if (name === 'default') return true; // can't reliably detect internal use of default
  const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
  const matches = content.match(re);
  return matches && matches.length > 1;
}

function buildTSGraph(gitChanges) {
  const srcDir = path.join(ROOT, 'src');
  const files = walkDir(srcDir, ['.ts', '.tsx']);

  const nodes = [];
  const edges = [];
  const edgeSet = new Set(); // deduplicate edges
  const allImportedNames = new Map(); // targetFile → Set of imported names

  // Parse all files
  const parsed = new Map();
  for (const f of files) {
    parsed.set(f, parseTSFile(f));
  }

  // Build edges & track imported names
  for (const [filePath, data] of parsed) {
    for (const imp of data.imports) {
      const target = resolveImportPath(imp, filePath);
      if (target && parsed.has(target)) {
        const edgeKey = `${filePath}→${target}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({ from: filePath, to: target });
        }
        // Track which names are imported
        const names = data.importedNames[imp] || [];
        if (!allImportedNames.has(target)) allImportedNames.set(target, new Set());
        for (const n of names) allImportedNames.get(target).add(n);
      }
    }
  }

  // Propagate re-export chains: if barrel re-exports name from source,
  // and someone imports that name from the barrel, credit the source too.
  for (const [barrelPath, barrelData] of parsed) {
    if (Object.keys(barrelData.reExportMap).length === 0) continue;
    const barrelImported = allImportedNames.get(barrelPath) || new Set();

    for (const [exportName, sourcePath] of Object.entries(barrelData.reExportMap)) {
      if (barrelImported.has(exportName) || barrelImported.has('*')) {
        // This name was imported from the barrel → credit the original source
        const resolvedSource = resolveImportPath(sourcePath, barrelPath);
        if (resolvedSource) {
          if (!allImportedNames.has(resolvedSource)) allImportedNames.set(resolvedSource, new Set());
          allImportedNames.get(resolvedSource).add(exportName);
        }
      }
    }
  }

  // BFS reachability from entry points
  const entryPoints = [
    path.join(ROOT, 'src/server/index.ts'),
    path.join(ROOT, 'src/client/main.tsx'),
    path.join(ROOT, 'src/client/App.tsx'),
  ].filter(f => fs.existsSync(f));

  const reachable = new Set();
  const queue = [...entryPoints];
  while (queue.length > 0) {
    const current = queue.shift();
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const e of edges) {
      if (e.from === current && !reachable.has(e.to)) {
        queue.push(e.to);
      }
    }
  }

  // Build nodes with status
  for (const [filePath, data] of parsed) {
    const rel = path.relative(ROOT, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const gitStatus = gitChanges.get(rel) || null;
    const isReachable = reachable.has(filePath);

    // Classify each export: dead / internal-only / active
    const importedSet = allImportedNames.get(filePath) || new Set();
    const externallyUsed = (name) =>
      importedSet.has(name) || importedSet.has('*') || (name === 'default' && importedSet.has('default'));

    const exportAnalysis = { dead: [], internalOnly: [], active: [] };
    const dedupedExports = [...new Set(data.exports)];

    for (const name of dedupedExports) {
      if (externallyUsed(name)) {
        exportAnalysis.active.push(name);
      } else if (isUsedInternally(content, name)) {
        exportAnalysis.internalOnly.push(name);
      } else {
        exportAnalysis.dead.push(name);
      }
    }

    // Backward compat: unusedExports = dead only (truly unused anywhere)
    const unusedExports = exportAnalysis.dead;

    // Skip .d.ts files (type declarations, not real code)
    const isDts = filePath.endsWith('.d.ts');

    // Status classification
    let status;
    if (gitStatus === 'D') status = 'deleted';
    else if (isDts) status = 'supporting';
    else if (!isReachable && gitStatus) status = 'suspicious';
    else if (!isReachable) status = 'cruft';
    else if (gitStatus) status = 'active';
    else status = 'supporting';

    const cluster = clusterForTS(filePath);
    nodes.push({
      id: filePath,
      rel,
      label: humanLabel(filePath),
      cluster: cluster.id,
      clusterLabel: cluster.label,
      zone: cluster.zone,
      status,
      gitStatus,
      loc: data.loc,
      exports: dedupedExports,
      unusedExports,
      exportAnalysis,
      importCount: new Set(data.imports).size,
      // Search index: terms this file can be found by
      searchTerms: [
        humanLabel(filePath),
        ...rel.split('/'),
        ...dedupedExports.filter(e => e !== 'default'),
      ].join(' ').toLowerCase(),
    });
  }

  // Enrich search terms with labels of imported files (so imageSelector matches "unsplash", "gemini", etc.)
  const nodeByRel = new Map(nodes.map(n => [n.rel, n]));
  for (const e of edges) {
    const fromRel = path.relative(ROOT, e.from);
    const toRel = path.relative(ROOT, e.to);
    const fromNode = nodeByRel.get(fromRel);
    const toNode = nodeByRel.get(toRel);
    if (fromNode && toNode) {
      fromNode.searchTerms += ' ' + toNode.label.toLowerCase();
    }
  }

  // Also include deleted files from git that no longer exist on disk
  for (const [rel, status] of gitChanges) {
    if (status === 'D' && rel.startsWith('src/') && (rel.endsWith('.ts') || rel.endsWith('.tsx'))) {
      const fullPath = path.join(ROOT, rel);
      if (!parsed.has(fullPath)) {
        const cluster = clusterForTS(fullPath);
        nodes.push({
          id: fullPath,
          rel,
          label: humanLabel(fullPath),
          cluster: cluster.id,
          clusterLabel: cluster.label,
          zone: cluster.zone,
          status: 'deleted',
          gitStatus: 'D',
          loc: 0,
          exports: [],
          unusedExports: [],
          exportAnalysis: { dead: [], internalOnly: [], active: [] },
          importCount: 0,
          searchTerms: [humanLabel(fullPath), ...rel.split('/')].join(' ').toLowerCase(),
        });
      }
    }
  }

  return { nodes, edges: edges.map(e => ({ from: path.relative(ROOT, e.from), to: path.relative(ROOT, e.to) })) };
}


// ───────────────────────────────────────────────
// Phase 6: Build Swift graph
// ───────────────────────────────────────────────

function buildSwiftGraph(gitChanges) {
  const iosDir = path.join(ROOT, 'ios/Trinity');
  const files = walkDir(iosDir, ['.swift']);
  const pbxprojPath = path.join(ROOT, 'ios/Trinity/Trinity.xcodeproj/project.pbxproj');
  const buildFiles = parsePbxproj(pbxprojPath);

  // Parse type definitions
  const typeMap = {}; // typeName → filePath
  const parsed = new Map();
  for (const f of files) {
    const data = parseSwiftFile(f);
    parsed.set(f, data);
    for (const typeName of data.defines) {
      typeMap[typeName] = f;
    }
  }

  // Build type reference edges
  const edges = buildSwiftReferences(files, typeMap);

  // Check build membership
  const buildMemberNames = buildFiles;

  // BFS from app entry point (TrinityApp.swift references types that reference others)
  // For Swift, since all files in the target are compiled, "reachable" means "in the build target"
  // But we can also do type-reference reachability from the app entry
  // BFS reachability — follow edges in BOTH directions since type usage
  // is bidirectional (if A uses type from B, both are part of the active graph)
  const appEntry = files.find(f => f.endsWith('TrinityApp.swift'));
  const reachable = new Set();
  if (appEntry) {
    const queue = [appEntry];
    while (queue.length > 0) {
      const current = queue.shift();
      if (reachable.has(current)) continue;
      reachable.add(current);
      for (const e of edges) {
        // Follow both directions: uses → and ← used by
        if (e.from === current && !reachable.has(e.to)) queue.push(e.to);
        if (e.to === current && !reachable.has(e.from)) queue.push(e.from);
      }
    }
  }

  const nodes = [];
  for (const [filePath, data] of parsed) {
    const rel = path.relative(ROOT, filePath);
    const basename = path.basename(filePath);
    const gitStatus = gitChanges.get(rel) || null;
    const inBuild = buildMemberNames.has(basename);
    const isReachable = reachable.has(filePath) || inBuild; // in-build = at least compiled

    let status;
    if (gitStatus === 'D') status = 'deleted';
    else if (!inBuild) status = 'cruft'; // not in Xcode project at all
    else if (!reachable.has(filePath) && gitStatus) status = 'suspicious';
    else if (!reachable.has(filePath)) status = 'supporting'; // in build but not type-reachable (could be extension-only)
    else if (gitStatus) status = 'active';
    else status = 'supporting';

    const cluster = clusterForSwift(filePath);
    nodes.push({
      id: filePath,
      rel,
      label: humanLabel(filePath),
      cluster: cluster.id,
      clusterLabel: cluster.label,
      zone: cluster.zone,
      status,
      gitStatus,
      loc: data.loc,
      defines: data.defines,
      inBuild,
      importCount: edges.filter(e => e.from === filePath).length,
      searchTerms: [
        humanLabel(filePath),
        ...rel.split('/'),
        ...data.defines,
      ].join(' ').toLowerCase(),
    });
  }

  // Include deleted files from git
  for (const [rel, status] of gitChanges) {
    if (status === 'D' && rel.startsWith('ios/Trinity/') && rel.endsWith('.swift')) {
      const fullPath = path.join(ROOT, rel);
      if (!parsed.has(fullPath)) {
        const cluster = clusterForSwift(fullPath);
        nodes.push({
          id: fullPath,
          rel,
          label: humanLabel(fullPath),
          cluster: cluster.id,
          clusterLabel: cluster.label,
          zone: cluster.zone,
          status: 'deleted',
          gitStatus: 'D',
          loc: 0,
          defines: [],
          inBuild: false,
          importCount: 0,
          searchTerms: [humanLabel(fullPath), ...rel.split('/')].join(' ').toLowerCase(),
        });
      }
    }
  }

  return { nodes, edges: edges.map(e => ({ from: path.relative(ROOT, e.from), to: path.relative(ROOT, e.to) })) };
}


// ───────────────────────────────────────────────
// Phase 7: Generate findings
// ───────────────────────────────────────────────

function generateFindings(tsGraph, swiftGraph) {
  const findings = [];

  // --- TypeScript findings ---
  const tsCruft = tsGraph.nodes.filter(n => n.status === 'cruft');
  const tsSuspicious = tsGraph.nodes.filter(n => n.status === 'suspicious');
  const tsDeleted = tsGraph.nodes.filter(n => n.status === 'deleted');
  const tsActive = tsGraph.nodes.filter(n => n.status === 'active');

  if (tsDeleted.length > 0) {
    const grouped = {};
    for (const n of tsDeleted) {
      const c = n.clusterLabel;
      if (!grouped[c]) grouped[c] = [];
      grouped[c].push(n.label);
    }
    for (const [cluster, files] of Object.entries(grouped)) {
      findings.push({
        severity: 'info',
        category: 'typescript',
        title: `${cluster} — ${files.length} file${files.length > 1 ? 's' : ''} deleted this branch`,
        detail: `Removed: ${files.join(', ')}. Verify no remaining code references these.`,
      });
    }
  }

  if (tsCruft.length > 0) {
    findings.push({
      severity: 'red',
      category: 'typescript',
      title: `${tsCruft.length} TypeScript file${tsCruft.length > 1 ? 's' : ''} appear unused`,
      detail: `Nothing connects to these from the app's starting points. Safe deletion candidates:\n${tsCruft.map(n => `  • ${n.label} (${n.rel})`).join('\n')}`,
    });
  }

  if (tsSuspicious.length > 0) {
    findings.push({
      severity: 'amber',
      category: 'typescript',
      title: `${tsSuspicious.length} file${tsSuspicious.length > 1 ? 's' : ''} changed but disconnected`,
      detail: `Modified on this branch but nothing references them — possible leftover from refactor:\n${tsSuspicious.map(n => `  • ${n.label} (${n.rel})`).join('\n')}`,
    });
  }

  // Export analysis — 3-tier classification using exportAnalysis from buildTSGraph
  const nodesWithAnalysis = tsGraph.nodes.filter(n =>
    n.exportAnalysis && n.status !== 'cruft' && n.status !== 'deleted'
  );

  // Truly dead exports: not used externally AND not used internally
  const deadExportFiles = nodesWithAnalysis
    .filter(n => n.exportAnalysis.dead.filter(e => e !== 'default').length > 0)
    .map(n => ({ ...n, deadList: n.exportAnalysis.dead.filter(e => e !== 'default') }))
    .sort((a, b) => b.deadList.length - a.deadList.length);

  if (deadExportFiles.length > 0) {
    const totalDead = deadExportFiles.reduce((s, n) => s + n.deadList.length, 0);
    findings.push({
      severity: 'red',
      category: 'typescript',
      title: `${totalDead} truly dead exports across ${deadExportFiles.length} files`,
      detail: `Not used externally OR internally — safe to delete:\n${deadExportFiles.slice(0, 12).map(n => `  • ${n.label}: ${n.deadList.slice(0, 4).join(', ')}${n.deadList.length > 4 ? ` (+${n.deadList.length - 4} more)` : ''}`).join('\n')}${deadExportFiles.length > 12 ? `\n  ... and ${deadExportFiles.length - 12} more files` : ''}`,
    });
  }

  // Over-exported: used internally but not externally — remove export keyword
  const overExportedFiles = nodesWithAnalysis
    .filter(n => n.exportAnalysis.internalOnly.filter(e => e !== 'default').length > 0)
    .map(n => ({ ...n, internalList: n.exportAnalysis.internalOnly.filter(e => e !== 'default') }))
    .sort((a, b) => b.internalList.length - a.internalList.length);

  if (overExportedFiles.length > 0) {
    const totalInternal = overExportedFiles.reduce((s, n) => s + n.internalList.length, 0);
    findings.push({
      severity: 'amber',
      category: 'typescript',
      title: `${totalInternal} over-exported functions across ${overExportedFiles.length} files`,
      detail: `Used internally but never imported elsewhere — remove the export keyword:\n${overExportedFiles.slice(0, 10).map(n => `  • ${n.label}: ${n.internalList.slice(0, 4).join(', ')}${n.internalList.length > 4 ? ` (+${n.internalList.length - 4} more)` : ''}`).join('\n')}${overExportedFiles.length > 10 ? `\n  ... and ${overExportedFiles.length - 10} more files` : ''}`,
    });
  }

  // Files that import something that's been deleted
  for (const edge of tsGraph.edges) {
    const targetNode = tsGraph.nodes.find(n => n.rel === edge.to);
    const sourceNode = tsGraph.nodes.find(n => n.rel === edge.from);
    if (targetNode && targetNode.status === 'deleted' && sourceNode && sourceNode.status !== 'deleted') {
      findings.push({
        severity: 'red',
        category: 'typescript',
        title: `Broken reference: ${sourceNode.label} → deleted ${targetNode.label}`,
        detail: `${sourceNode.rel} still imports from ${targetNode.rel} which has been removed.`,
      });
    }
  }

  // --- Swift findings ---
  const swCruft = swiftGraph.nodes.filter(n => n.status === 'cruft');
  const swDeleted = swiftGraph.nodes.filter(n => n.status === 'deleted');
  const swActive = swiftGraph.nodes.filter(n => n.status === 'active');
  const swNotInBuild = swiftGraph.nodes.filter(n => !n.inBuild && n.status !== 'deleted');

  if (swDeleted.length > 0) {
    const grouped = {};
    for (const n of swDeleted) {
      const c = n.clusterLabel;
      if (!grouped[c]) grouped[c] = [];
      grouped[c].push(n.label);
    }
    for (const [cluster, files] of Object.entries(grouped)) {
      findings.push({
        severity: 'info',
        category: 'swift',
        title: `${cluster} (iOS) — ${files.length} file${files.length > 1 ? 's' : ''} deleted this branch`,
        detail: `Removed: ${files.join(', ')}. Verify no remaining code references these types.`,
      });
    }
  }

  if (swNotInBuild.length > 0) {
    findings.push({
      severity: 'red',
      category: 'swift',
      title: `${swNotInBuild.length} Swift file${swNotInBuild.length > 1 ? 's' : ''} not in Xcode build target`,
      detail: `On disk but not compiled — dead weight:\n${swNotInBuild.map(n => `  • ${n.label} (${n.rel})`).join('\n')}`,
    });
  }

  if (swCruft.length > 0 && swCruft.length !== swNotInBuild.length) {
    const buildCruft = swCruft.filter(n => n.inBuild);
    if (buildCruft.length > 0) {
      findings.push({
        severity: 'amber',
        category: 'swift',
        title: `${buildCruft.length} Swift file${buildCruft.length > 1 ? 's' : ''} compiled but possibly unused`,
        detail: `In the build target but no other project type references them:\n${buildCruft.map(n => `  • ${n.label} (${n.rel})`).join('\n')}`,
      });
    }
  }

  // Summary
  findings.push({
    severity: 'info',
    category: 'summary',
    title: 'Codebase overview',
    detail: `TypeScript: ${tsGraph.nodes.filter(n=>n.status!=='deleted').length} files (${tsActive.length} active, ${tsCruft.length} unused)\nSwift: ${swiftGraph.nodes.filter(n=>n.status!=='deleted').length} files (${swActive.length} active, ${swCruft.length + swNotInBuild.length} unused)\nDeleted this branch: ${tsDeleted.length + swDeleted.length} files`,
  });

  return findings;
}


// ───────────────────────────────────────────────
// Phase 8: Assemble view data
// ───────────────────────────────────────────────

function assembleViewData(graph) {
  // Group nodes into clusters
  const clusterMap = {};
  for (const node of graph.nodes) {
    if (!clusterMap[node.cluster]) {
      clusterMap[node.cluster] = {
        id: node.cluster,
        label: node.clusterLabel,
        zone: node.zone,
        files: [],
      };
    }
    clusterMap[node.cluster].files.push(node);
  }

  const clusters = Object.values(clusterMap);

  // Compute cluster stats
  for (const c of clusters) {
    c.totalFiles = c.files.length;
    c.activeFiles = c.files.filter(f => f.status === 'active').length;
    c.croftFiles = c.files.filter(f => f.status === 'cruft').length;
    c.deletedFiles = c.files.filter(f => f.status === 'deleted').length;
    c.suspiciousFiles = c.files.filter(f => f.status === 'suspicious').length;
    c.totalLoc = c.files.reduce((s, f) => s + f.loc, 0);
    // Dominant status for color
    if (c.croftFiles > 0) c.health = 'warning';
    else if (c.deletedFiles === c.totalFiles) c.health = 'deleted';
    else if (c.activeFiles > 0) c.health = 'active';
    else c.health = 'healthy';
    c.hasChanges = c.files.some(f => f.gitStatus);
  }

  // Build cluster-level edges
  const clusterEdges = {};
  for (const edge of graph.edges) {
    const fromNode = graph.nodes.find(n => n.rel === edge.from);
    const toNode = graph.nodes.find(n => n.rel === edge.to);
    if (!fromNode || !toNode) continue;
    if (fromNode.cluster === toNode.cluster) continue;
    const key = `${fromNode.cluster}→${toNode.cluster}`;
    if (!clusterEdges[key]) clusterEdges[key] = { from: fromNode.cluster, to: toNode.cluster, weight: 0 };
    clusterEdges[key].weight++;
  }

  return {
    clusters,
    clusterEdges: Object.values(clusterEdges),
    fileEdges: graph.edges,
  };
}


// ───────────────────────────────────────────────
// Phase 9: Generate HTML
// ───────────────────────────────────────────────

function generateHTML(tsData, swiftData, findings) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Codebase Health Map — Road Not Taken</title>
<link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://d3js.org/d3.v7.min.js"><\/script>
<style>
:root {
  --ink: #1a1a1a;
  --paper: #fafaf9;
  --accent: #d97706;
  --green: #22c55e;
  --green-dim: #166534;
  --amber: #f59e0b;
  --red: #ef4444;
  --blue: #3b82f6;
  --gray: #6b7280;
  --bg: #111111;
  --surface: #1e1e1e;
  --border: #333;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--bg);
  color: var(--paper);
  font-family: 'Inter', system-ui, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ── */
header {
  padding: 16px 24px 0;
  border-bottom: 1px solid var(--border);
}
.title-row {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 12px;
}
.title-row h1 {
  font-family: 'Crimson Pro', serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--paper);
}
.title-row .subtitle {
  font-size: 13px;
  color: var(--gray);
}

/* Health bar */
.health-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
  gap: 2px;
}
.health-bar .segment {
  border-radius: 2px;
  transition: flex 0.3s;
}

/* Summary stats */
.stats {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
  font-size: 13px;
}
.stats .stat {
  display: flex;
  align-items: center;
  gap: 6px;
}
.stats .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Tabs + Search row */
.tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tabs {
  display: flex;
  gap: 0;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-box input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--paper);
  width: 260px;
  outline: none;
  font-family: 'Inter', system-ui, sans-serif;
}
.search-box input:focus {
  border-color: var(--accent);
}
.search-box input::placeholder {
  color: #555;
}
.search-count {
  font-size: 11px;
  color: var(--gray);
  white-space: nowrap;
}
.tab {
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  background: none;
  color: var(--gray);
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.tab:hover { color: var(--paper); }
.tab.active {
  color: var(--paper);
  border-bottom-color: var(--accent);
}

/* ── Main workspace ── */
main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 340px;
  overflow: hidden;
}

/* Graph area */
.graph-area {
  position: relative;
  overflow: hidden;
}
.graph-area svg {
  width: 100%;
  height: 100%;
}

/* Legend overlay */
.legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

/* Side panel */
.panel {
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  font-family: 'Crimson Pro', serif;
  font-size: 18px;
  font-weight: 600;
}
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.panel-section {
  margin-bottom: 20px;
}
.panel-section h3 {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gray);
  margin-bottom: 8px;
}
.panel-section p {
  font-size: 13px;
  line-height: 1.5;
  color: #d1d5db;
}
.panel-section ul {
  list-style: none;
  padding: 0;
}
.panel-section li {
  font-size: 13px;
  padding: 4px 0;
  color: #d1d5db;
  display: flex;
  align-items: center;
  gap: 6px;
}
.panel-section li .pip {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Status badge */
.badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.badge-active { background: rgba(34,197,94,0.15); color: var(--green); }
.badge-supporting { background: rgba(107,114,128,0.15); color: var(--gray); }
.badge-suspicious { background: rgba(245,158,11,0.15); color: var(--amber); }
.badge-cruft { background: rgba(239,68,68,0.15); color: var(--red); }
.badge-deleted { background: rgba(107,114,128,0.1); color: #555; text-decoration: line-through; }

/* File list in panel */
.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
}
.file-item:hover { background: rgba(255,255,255,0.05); }
.file-item .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.file-item .name { flex: 1; }
.file-item .meta { color: var(--gray); font-size: 11px; }

/* Findings section */
.findings-panel {
  border-top: 1px solid var(--border);
  max-height: 220px;
  overflow-y: auto;
  padding: 12px 20px;
}
.finding {
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border-left: 3px solid;
  background: var(--surface);
}
.finding-red { border-color: var(--red); }
.finding-amber { border-color: var(--amber); }
.finding-info { border-color: var(--blue); }
.finding h4 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}
.finding pre {
  font-size: 12px;
  color: #9ca3af;
  white-space: pre-wrap;
  font-family: 'Inter', system-ui, sans-serif;
  line-height: 1.5;
}

/* D3 node styles */
.cluster-node { cursor: pointer; }
.cluster-node:hover circle { filter: brightness(1.2); }
.cluster-label {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 600;
  fill: var(--paper);
  text-anchor: middle;
  pointer-events: none;
}
.cluster-sublabel {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 10px;
  fill: var(--gray);
  text-anchor: middle;
  pointer-events: none;
}
.cluster-edge {
  fill: none;
  stroke: #333;
  stroke-width: 1;
  opacity: 0.4;
}
.file-node { cursor: pointer; }
.file-label {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 10px;
  fill: #aaa;
  pointer-events: none;
}

/* Focus dimming */
.dimmed { opacity: 0.08 !important; transition: opacity 0.3s; }
.adjacent { opacity: 0.5 !important; transition: opacity 0.3s; }
.focused { opacity: 1 !important; transition: opacity 0.3s; }

/* Instructions overlay */
.instructions {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: var(--gray);
  background: var(--surface);
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--border);
  pointer-events: none;
  transition: opacity 0.5s;
}
</style>
</head>
<body>

<header>
  <div class="title-row">
    <h1>Codebase Health Map</h1>
    <span class="subtitle">Road Not Taken · <span id="branch-name"></span></span>
  </div>
  <div class="health-bar" id="health-bar"></div>
  <div class="stats" id="stats"></div>
  <div class="tabs-row">
    <div class="tabs">
      <button class="tab active" data-view="typescript">TypeScript</button>
      <button class="tab" data-view="swift">Swift</button>
    </div>
    <div class="search-box">
      <input type="text" id="search" placeholder="Search: e.g. image, auth, pdf..." autocomplete="off" spellcheck="false">
      <span id="search-count" class="search-count"></span>
    </div>
  </div>
</header>

<main>
  <div class="graph-area">
    <svg id="graph"></svg>
    <div class="instructions" id="instructions">Click a bubble to focus · Click background to reset · Scroll to zoom</div>
    <div class="legend">
      <div class="legend-item"><div class="legend-swatch" style="background:var(--green)"></div> Active — changed & connected</div>
      <div class="legend-item"><div class="legend-swatch" style="background:var(--gray)"></div> Supporting — connected, untouched</div>
      <div class="legend-item"><div class="legend-swatch" style="background:var(--amber)"></div> Suspicious — changed but disconnected</div>
      <div class="legend-item"><div class="legend-swatch" style="background:var(--red)"></div> Unused — nothing connects to it</div>
      <div class="legend-item"><div class="legend-swatch" style="background:#444;border:1px dashed #666"></div> Deleted this branch</div>
      <div class="legend-item"><div class="legend-swatch" style="background:transparent;border:2px solid var(--blue);"></div> Has changes on branch</div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-header" id="panel-title">Overview</div>
    <div class="panel-body" id="panel-body">
      <div class="panel-section">
        <p style="color:var(--gray)">Click a bubble or file to see details.</p>
      </div>
    </div>
    <div class="findings-panel" id="findings"></div>
  </div>
</main>

<script>
// ── Embedded data ──
const TS_DATA = ${JSON.stringify(tsData)};
const SWIFT_DATA = ${JSON.stringify(swiftData)};
const FINDINGS = ${JSON.stringify(findings)};

// ── State ──
let currentView = 'typescript';
let focusedCluster = null;
let selectedFile = null;

// ── Color helpers ──
const STATUS_COLORS = {
  active: '#22c55e',
  supporting: '#6b7280',
  suspicious: '#f59e0b',
  cruft: '#ef4444',
  deleted: '#444',
};

function clusterFill(cluster) {
  if (cluster.deletedFiles === cluster.totalFiles) return '#333';
  if (cluster.croftFiles > 0) return 'rgba(239,68,68,0.12)';
  if (cluster.activeFiles > 0) return 'rgba(34,197,94,0.1)';
  return 'rgba(107,114,128,0.08)';
}

function clusterStroke(cluster) {
  if (cluster.deletedFiles === cluster.totalFiles) return '#555';
  if (cluster.hasChanges) return '#3b82f6';
  if (cluster.croftFiles > 0) return '#ef4444';
  return '#444';
}

// ── Data access ──
function getData() {
  return currentView === 'typescript' ? TS_DATA : SWIFT_DATA;
}

// ── Render summary ──
function renderSummary() {
  const data = getData();
  const files = data.clusters.flatMap(c => c.files);
  const live = files.filter(f => f.status !== 'deleted');
  const active = live.filter(f => f.status === 'active').length;
  const supporting = live.filter(f => f.status === 'supporting').length;
  const suspicious = live.filter(f => f.status === 'suspicious').length;
  const cruft = live.filter(f => f.status === 'cruft').length;
  const deleted = files.filter(f => f.status === 'deleted').length;
  const total = live.length;

  // Health bar
  const bar = document.getElementById('health-bar');
  bar.innerHTML = '';
  if (supporting > 0) bar.innerHTML += '<div class="segment" style="flex:' + supporting + ';background:var(--gray)"></div>';
  if (active > 0) bar.innerHTML += '<div class="segment" style="flex:' + active + ';background:var(--green)"></div>';
  if (suspicious > 0) bar.innerHTML += '<div class="segment" style="flex:' + suspicious + ';background:var(--amber)"></div>';
  if (cruft > 0) bar.innerHTML += '<div class="segment" style="flex:' + cruft + ';background:var(--red)"></div>';

  // Stats
  const stats = document.getElementById('stats');
  stats.innerHTML =
    '<div class="stat"><div class="dot" style="background:var(--green)"></div>' + active + ' active</div>' +
    '<div class="stat"><div class="dot" style="background:var(--gray)"></div>' + supporting + ' supporting</div>' +
    (suspicious > 0 ? '<div class="stat"><div class="dot" style="background:var(--amber)"></div>' + suspicious + ' suspicious</div>' : '') +
    (cruft > 0 ? '<div class="stat"><div class="dot" style="background:var(--red)"></div>' + cruft + ' unused</div>' : '') +
    (deleted > 0 ? '<div class="stat"><div class="dot" style="background:#555"></div>' + deleted + ' deleted</div>' : '') +
    '<div class="stat" style="color:var(--gray)">' + total + ' total</div>';
}

// ── Render findings ──
function renderFindings() {
  const el = document.getElementById('findings');
  const viewFindings = FINDINGS.filter(f => f.category === currentView || f.category === 'summary'  || f.category === (currentView === 'typescript' ? 'typescript' : 'swift'));
  el.innerHTML = viewFindings.map(f => {
    const cls = f.severity === 'red' ? 'finding-red' : f.severity === 'amber' ? 'finding-amber' : 'finding-info';
    return '<div class="finding ' + cls + '"><h4>' + escHtml(f.title) + '</h4><pre>' + escHtml(f.detail) + '</pre></div>';
  }).join('');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Render graph ──
let simulation = null;

function renderGraph() {
  const svg = d3.select('#graph');
  svg.selectAll('*').remove();

  const rect = svg.node().getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;

  const g = svg.append('g');

  // Zoom
  svg.call(d3.zoom()
    .scaleExtent([0.3, 4])
    .on('zoom', (e) => g.attr('transform', e.transform))
  );

  // Click background to reset focus
  svg.on('click', (e) => {
    if (e.target === svg.node()) resetFocus();
  });

  const data = getData();
  const clusters = data.clusters.filter(c => c.totalFiles > 0);
  const clusterEdges = data.clusterEdges;

  // Assign initial positions by zone
  const zonePositions = currentView === 'typescript' ? {
    server: { x: W * 0.3, y: H * 0.4 },
    client: { x: W * 0.7, y: H * 0.4 },
    shared: { x: W * 0.5, y: H * 0.7 },
    other: { x: W * 0.5, y: H * 0.85 },
  } : {
    features: { x: W * 0.5, y: H * 0.35 },
    core: { x: W * 0.5, y: H * 0.7 },
    other: { x: W * 0.5, y: H * 0.85 },
  };

  // Prepare simulation nodes
  const simNodes = clusters.map((c, i) => ({
    ...c,
    radius: Math.sqrt(c.totalFiles) * 18 + 22,
    x: (zonePositions[c.zone] || zonePositions.other).x + (Math.random() - 0.5) * 80,
    y: (zonePositions[c.zone] || zonePositions.other).y + (Math.random() - 0.5) * 80,
  }));

  const simEdges = clusterEdges.map(e => ({
    source: simNodes.find(n => n.id === e.from),
    target: simNodes.find(n => n.id === e.to),
    weight: e.weight,
  })).filter(e => e.source && e.target);

  // Draw edges
  const edgeGroup = g.append('g').attr('class', 'edges');
  const edgeEls = edgeGroup.selectAll('path')
    .data(simEdges)
    .join('path')
    .attr('class', 'cluster-edge')
    .attr('stroke-width', d => Math.max(1, Math.min(4, d.weight / 3)));

  // Draw cluster bubbles
  const nodeGroup = g.append('g').attr('class', 'nodes');
  const nodeEls = nodeGroup.selectAll('g')
    .data(simNodes)
    .join('g')
    .attr('class', 'cluster-node')
    .on('click', (e, d) => { e.stopPropagation(); focusOnCluster(d, simNodes, simEdges); });

  // Outer ring (change indicator)
  nodeEls.append('circle')
    .attr('r', d => d.radius + 3)
    .attr('fill', 'none')
    .attr('stroke', d => d.hasChanges ? '#3b82f6' : 'transparent')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', d => d.deletedFiles === d.totalFiles ? '4,4' : 'none');

  // Main bubble
  nodeEls.append('circle')
    .attr('r', d => d.radius)
    .attr('fill', d => clusterFill(d))
    .attr('stroke', d => clusterStroke(d))
    .attr('stroke-width', 1.5);

  // Mini pie: show proportion of statuses inside bubble
  nodeEls.each(function(d) {
    const g = d3.select(this);
    const statusCounts = [
      { status: 'active', count: d.activeFiles },
      { status: 'supporting', count: d.files.filter(f=>f.status==='supporting').length },
      { status: 'suspicious', count: d.suspiciousFiles },
      { status: 'cruft', count: d.croftFiles },
      { status: 'deleted', count: d.deletedFiles },
    ].filter(s => s.count > 0);

    if (statusCounts.length <= 1) return; // skip if homogeneous

    const pie = d3.pie().value(s => s.count).sort(null);
    const arc = d3.arc().innerRadius(d.radius * 0.5).outerRadius(d.radius * 0.8);

    g.selectAll('.mini-arc')
      .data(pie(statusCounts))
      .join('path')
      .attr('class', 'mini-arc')
      .attr('d', arc)
      .attr('fill', s => STATUS_COLORS[s.data.status])
      .attr('opacity', 0.5);
  });

  // Labels
  nodeEls.append('text')
    .attr('class', 'cluster-label')
    .attr('y', -4)
    .text(d => d.label);

  nodeEls.append('text')
    .attr('class', 'cluster-sublabel')
    .attr('y', 10)
    .text(d => {
      const live = d.totalFiles - d.deletedFiles;
      const parts = [live + ' file' + (live !== 1 ? 's' : '')];
      if (d.activeFiles > 0) parts.push(d.activeFiles + ' changed');
      if (d.croftFiles > 0) parts.push(d.croftFiles + ' unused');
      return parts.join(' · ');
    });

  // Force simulation
  simulation = d3.forceSimulation(simNodes)
    .force('center', d3.forceCenter(W / 2, H / 2).strength(0.05))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('collide', d3.forceCollide(d => d.radius + 15).strength(0.8))
    .force('link', d3.forceLink(simEdges).strength(0.15).distance(d => 150))
    .force('x', d3.forceX(d => (zonePositions[d.zone] || zonePositions.other).x).strength(0.08))
    .force('y', d3.forceY(d => (zonePositions[d.zone] || zonePositions.other).y).strength(0.08))
    .on('tick', () => {
      edgeEls.attr('d', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx*dx + dy*dy) * 1.2;
        return 'M' + d.source.x + ',' + d.source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + d.target.x + ',' + d.target.y;
      });
      nodeEls.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
    });

  // Drag
  nodeEls.call(d3.drag()
    .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.1).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
  );

  // Hide instructions after first interaction
  svg.on('click.instructions', () => {
    document.getElementById('instructions').style.opacity = '0';
  }, { once: true });
}

// ── Focus mechanic ──
function focusOnCluster(cluster, allNodes, allEdges) {
  focusedCluster = cluster.id;
  selectedFile = null;

  // Determine which clusters are adjacent
  const data = getData();
  const adjacent = new Set();
  for (const e of data.clusterEdges) {
    if (e.from === cluster.id) adjacent.add(e.to);
    if (e.to === cluster.id) adjacent.add(e.from);
  }

  // Apply focus classes
  d3.selectAll('.cluster-node')
    .classed('focused', d => d.id === cluster.id)
    .classed('adjacent', d => d.id !== cluster.id && adjacent.has(d.id))
    .classed('dimmed', d => d.id !== cluster.id && !adjacent.has(d.id));

  d3.selectAll('.cluster-edge')
    .classed('focused', d => d.source.id === cluster.id || d.target.id === cluster.id)
    .classed('dimmed', d => d.source.id !== cluster.id && d.target.id !== cluster.id)
    .attr('stroke', d => (d.source.id === cluster.id || d.target.id === cluster.id) ? '#666' : '#333')
    .attr('opacity', d => (d.source.id === cluster.id || d.target.id === cluster.id) ? 0.7 : 0.05);

  // Update panel
  renderClusterPanel(cluster, adjacent);
}

function resetFocus() {
  focusedCluster = null;
  selectedFile = null;

  d3.selectAll('.cluster-node').classed('focused', false).classed('adjacent', false).classed('dimmed', false);
  d3.selectAll('.cluster-edge')
    .classed('focused', false).classed('dimmed', false)
    .attr('stroke', '#333').attr('opacity', 0.4);

  document.getElementById('panel-title').textContent = 'Overview';
  document.getElementById('panel-body').innerHTML =
    '<div class="panel-section"><p style="color:var(--gray)">Click a bubble to see what\\'s inside and how it connects to the rest of the system.</p></div>';
}

// ── Panel rendering ──
function renderClusterPanel(cluster, adjacent) {
  const data = getData();
  document.getElementById('panel-title').textContent = cluster.label;

  const live = cluster.files.filter(f => f.status !== 'deleted');
  const deleted = cluster.files.filter(f => f.status === 'deleted');

  // Connections
  const outgoing = data.clusterEdges.filter(e => e.from === cluster.id);
  const incoming = data.clusterEdges.filter(e => e.to === cluster.id);

  let html = '';

  // Summary
  html += '<div class="panel-section"><h3>Summary</h3>';
  html += '<p>' + live.length + ' component' + (live.length !== 1 ? 's' : '');
  if (cluster.activeFiles > 0) html += ' · <span style="color:var(--green)">' + cluster.activeFiles + ' changed</span>';
  if (cluster.croftFiles > 0) html += ' · <span style="color:var(--red)">' + cluster.croftFiles + ' unused</span>';
  if (deleted.length > 0) html += ' · <span style="color:#555">' + deleted.length + ' deleted</span>';
  html += '</p></div>';

  // Connections
  if (outgoing.length > 0 || incoming.length > 0) {
    html += '<div class="panel-section"><h3>Connects to</h3><ul>';
    const allConnected = new Map();
    for (const e of outgoing) {
      const target = data.clusters.find(c => c.id === e.to);
      if (target) allConnected.set(target.label, (allConnected.get(target.label) || '') + ' → uses');
    }
    for (const e of incoming) {
      const source = data.clusters.find(c => c.id === e.from);
      if (source) allConnected.set(source.label, (allConnected.get(source.label) || '') + ' ← used by');
    }
    for (const [name, dir] of allConnected) {
      const arrow = dir.includes('→') && dir.includes('←') ? '↔' : dir.includes('→') ? '→' : '←';
      html += '<li><span class="pip" style="background:var(--blue)"></span>' + arrow + ' ' + escHtml(name) + '</li>';
    }
    html += '</ul></div>';
  }

  // File list
  html += '<div class="panel-section"><h3>Components</h3>';
  const sorted = [...live].sort((a, b) => {
    const order = { active: 0, suspicious: 1, cruft: 2, supporting: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  });
  for (const f of sorted) {
    html += '<div class="file-item" onclick="selectFile(\\'' + f.rel.replace(/'/g, "\\\\'") + '\\')">';
    html += '<div class="status-dot" style="background:' + STATUS_COLORS[f.status] + '"></div>';
    html += '<span class="name">' + escHtml(f.label) + '</span>';
    html += '<span class="badge badge-' + f.status + '">' + f.status + '</span>';
    html += '</div>';
  }
  if (deleted.length > 0) {
    for (const f of deleted) {
      html += '<div class="file-item" style="opacity:0.4;text-decoration:line-through">';
      html += '<div class="status-dot" style="background:#444;border:1px dashed #666"></div>';
      html += '<span class="name">' + escHtml(f.label) + '</span>';
      html += '</div>';
    }
  }
  html += '</div>';

  document.getElementById('panel-body').innerHTML = html;
}

function selectFile(rel) {
  const data = getData();
  const file = data.clusters.flatMap(c => c.files).find(f => f.rel === rel);
  if (!file) return;

  document.getElementById('panel-title').textContent = file.label;

  let html = '';

  // Status
  html += '<div class="panel-section">';
  html += '<span class="badge badge-' + file.status + '">' + file.status + '</span>';
  if (file.gitStatus) html += ' <span style="color:var(--blue);font-size:12px">changed on branch</span>';
  html += '</div>';

  // Path
  html += '<div class="panel-section"><h3>Location</h3>';
  html += '<p style="font-family:monospace;font-size:11px;color:#888;word-break:break-all">' + escHtml(file.rel) + '</p>';
  html += '<p style="font-size:12px;color:var(--gray)">' + file.loc + ' lines</p></div>';

  // Connections (for TS files)
  if (currentView === 'typescript') {
    const imports = data.fileEdges.filter(e => e.from === file.rel);
    const importedBy = data.fileEdges.filter(e => e.to === file.rel);

    if (imports.length > 0) {
      html += '<div class="panel-section"><h3>Uses (' + imports.length + ')</h3><ul>';
      for (const e of imports) {
        const target = data.clusters.flatMap(c => c.files).find(f => f.rel === e.to);
        html += '<li><span class="pip" style="background:' + (target ? STATUS_COLORS[target.status] : '#555') + '"></span>';
        html += escHtml(target ? target.label : e.to) + '</li>';
      }
      html += '</ul></div>';
    }

    if (importedBy.length > 0) {
      html += '<div class="panel-section"><h3>Used by (' + importedBy.length + ')</h3><ul>';
      for (const e of importedBy) {
        const source = data.clusters.flatMap(c => c.files).find(f => f.rel === e.from);
        html += '<li><span class="pip" style="background:' + (source ? STATUS_COLORS[source.status] : '#555') + '"></span>';
        html += escHtml(source ? source.label : e.from) + '</li>';
      }
      html += '</ul></div>';
    }

    // Export analysis — 3-tier
    if (file.exportAnalysis) {
      const ea = file.exportAnalysis;
      if (ea.dead && ea.dead.length > 0) {
        html += '<div class="panel-section"><h3 style="color:var(--red)">Dead exports (' + ea.dead.length + ')</h3>';
        html += '<p style="font-size:12px;color:#888;margin-bottom:6px">Not used externally or internally — safe to delete</p><ul>';
        for (const name of ea.dead) {
          html += '<li style="color:var(--red)"><span class="pip" style="background:var(--red)"></span>' + escHtml(name) + '</li>';
        }
        html += '</ul></div>';
      }
      if (ea.internalOnly && ea.internalOnly.length > 0) {
        html += '<div class="panel-section"><h3 style="color:var(--amber)">Over-exported (' + ea.internalOnly.length + ')</h3>';
        html += '<p style="font-size:12px;color:#888;margin-bottom:6px">Used internally but never imported — remove export keyword</p><ul>';
        for (const name of ea.internalOnly) {
          html += '<li style="color:var(--amber)"><span class="pip" style="background:var(--amber)"></span>' + escHtml(name) + '</li>';
        }
        html += '</ul></div>';
      }
    }
  }

  // Swift-specific
  if (currentView === 'swift') {
    if (file.defines && file.defines.length > 0) {
      html += '<div class="panel-section"><h3>Defines</h3><ul>';
      for (const t of file.defines) {
        html += '<li><span class="pip" style="background:var(--blue)"></span>' + escHtml(t) + '</li>';
      }
      html += '</ul></div>';
    }
    if (file.inBuild === false) {
      html += '<div class="panel-section"><p style="color:var(--red)">⚠ Not in Xcode build target — this file is not compiled.</p></div>';
    }
  }

  document.getElementById('panel-body').innerHTML = html;
}

// ── Tab switching ──
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentView = tab.dataset.view;
    focusedCluster = null;
    selectedFile = null;
    renderSummary();
    renderGraph();
    renderFindings();
    resetFocus();
  });
});

// ── Search ──
let searchTimeout = null;
const searchInput = document.getElementById('search');
const searchCount = document.getElementById('search-count');

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => doSearch(searchInput.value.trim()), 150);
});
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { searchInput.value = ''; doSearch(''); searchInput.blur(); }
});

function doSearch(query) {
  if (!query) {
    // Clear search — reset all
    searchCount.textContent = '';
    resetFocus();
    return;
  }

  const terms = query.toLowerCase().split(/\s+/);
  const data = getData();
  const allFiles = data.clusters.flatMap(c => c.files);

  // Match files against search terms (all terms must match)
  const matches = allFiles.filter(f => {
    const haystack = f.searchTerms || (f.label + ' ' + f.rel).toLowerCase();
    return terms.every(t => haystack.includes(t));
  });

  const matchRels = new Set(matches.map(f => f.rel));

  // Find clusters that contain matches
  const matchClusters = new Set(matches.map(f => f.cluster));

  // Find adjacent clusters (connected to a match cluster)
  const adjacentClusters = new Set();
  for (const e of data.clusterEdges) {
    if (matchClusters.has(e.from)) adjacentClusters.add(e.to);
    if (matchClusters.has(e.to)) adjacentClusters.add(e.from);
  }

  // Dim/highlight clusters
  d3.selectAll('.cluster-node')
    .classed('focused', d => matchClusters.has(d.id))
    .classed('adjacent', d => !matchClusters.has(d.id) && adjacentClusters.has(d.id))
    .classed('dimmed', d => !matchClusters.has(d.id) && !adjacentClusters.has(d.id));

  d3.selectAll('.cluster-edge')
    .attr('opacity', d => {
      const srcMatch = matchClusters.has(d.source.id);
      const tgtMatch = matchClusters.has(d.target.id);
      return (srcMatch || tgtMatch) ? 0.6 : 0.03;
    })
    .attr('stroke', d => {
      const srcMatch = matchClusters.has(d.source.id);
      const tgtMatch = matchClusters.has(d.target.id);
      return (srcMatch && tgtMatch) ? 'var(--accent)' : '#444';
    });

  // Update count
  searchCount.textContent = matches.length + ' match' + (matches.length !== 1 ? 'es' : '');

  // Update side panel with search results
  document.getElementById('panel-title').textContent = 'Search: ' + query;
  let html = '';

  // Group by cluster
  const grouped = {};
  for (const f of matches) {
    if (!grouped[f.clusterLabel]) grouped[f.clusterLabel] = [];
    grouped[f.clusterLabel].push(f);
  }

  for (const [cluster, files] of Object.entries(grouped)) {
    html += '<div class="panel-section"><h3>' + escHtml(cluster) + '</h3>';
    for (const f of files) {
      html += '<div class="file-item" onclick="selectFile(\\'' + f.rel.replace(/'/g, "\\\\'") + '\\')">';
      html += '<div class="status-dot" style="background:' + STATUS_COLORS[f.status] + '"></div>';
      html += '<span class="name">' + escHtml(f.label) + '</span>';
      html += '<span class="badge badge-' + f.status + '">' + f.status + '</span>';
      html += '</div>';
    }
    html += '</div>';
  }

  if (matches.length === 0) {
    html = '<div class="panel-section"><p style="color:var(--gray)">No files match "' + escHtml(query) + '"</p></div>';
  }

  document.getElementById('panel-body').innerHTML = html;
}

// ── Branch name ──
document.getElementById('branch-name').textContent = ${JSON.stringify(getBranchName())};

// ── Init ──
renderSummary();
renderGraph();
renderFindings();
</script>
</body>
</html>`;
}


// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function getBranchName() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}


// ───────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────

function analyze() {
  const gitChanges = getGitChanges();
  const tsGraph = buildTSGraph(gitChanges);
  const swiftGraph = buildSwiftGraph(gitChanges);
  const findings = generateFindings(tsGraph, swiftGraph);
  const tsData = assembleViewData(tsGraph);
  const swiftData = assembleViewData(swiftGraph);
  return { tsGraph, swiftGraph, tsData, swiftData, findings, gitChanges };
}

function searchFiles(query, tsData, swiftData) {
  const terms = query.toLowerCase().split(/\s+/);
  const results = { typescript: [], swift: [] };

  for (const [viewName, data] of [['typescript', tsData], ['swift', swiftData]]) {
    const allFiles = data.clusters.flatMap(c => c.files);
    const matches = allFiles.filter(f => {
      const haystack = f.searchTerms || (f.label + ' ' + f.rel).toLowerCase();
      return terms.every(t => haystack.includes(t));
    });
    results[viewName] = matches.map(f => ({
      label: f.label,
      path: f.rel,
      status: f.status,
      cluster: f.clusterLabel,
      loc: f.loc,
      ...(f.exportAnalysis ? {
        deadExports: f.exportAnalysis.dead,
        overExported: f.exportAnalysis.internalOnly,
      } : {}),
      ...(f.defines ? { defines: f.defines } : {}),
    }));
  }
  return results;
}

// ───────────────────────────────────────────────
// Trace: smart code retrieval for LLM reasoning
// ───────────────────────────────────────────────

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their',
  'this', 'that', 'these', 'those',
  'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither',
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'into', 'through',
  'about', 'after', 'before', 'between', 'under', 'over', 'up', 'down',
  'if', 'then', 'else', 'when', 'where', 'how', 'what', 'which', 'who', 'whom',
  'all', 'each', 'every', 'any', 'some', 'no', 'only', 'very', 'just',
  'also', 'as', 'like', 'than', 'more', 'most', 'less', 'least',
  'here', 'there', 'now', 'then', 'still', 'already', 'always', 'never',
  'work', 'works', 'working', 'supposed', 'should', 'does', 'doing',
  'code', 'feature', 'service', 'system', 'function', 'actually', 'really',
  'using', 'used', 'uses', 'use', 'called', 'calls', 'call',
  'handles', 'handle', 'handling',
  'get', 'gets', 'set', 'sets', 'make', 'makes',
  'first', 'second', 'third', 'last', 'next', 'best', 'new', 'old',
  'one', 'two', 'three', 'four', 'five',
  'pick', 'picks', 'picked', 'select', 'selects', 'selected', 'selection',
  'send', 'sends', 'sent', 'receive', 'receives', 'received',
  'show', 'shows', 'shown', 'display', 'displays', 'render', 'renders',
  'create', 'creates', 'created', 'build', 'builds', 'built',
  'run', 'runs', 'running', 'start', 'starts', 'started',
  'check', 'checks', 'checked', 'find', 'finds', 'found',
  'load', 'loads', 'loaded', 'save', 'saves', 'saved',
  'data', 'file', 'files', 'list', 'item', 'items', 'result', 'results',
  'type', 'types', 'value', 'values', 'name', 'names', 'path', 'paths',
  'error', 'errors', 'response', 'request', 'return', 'returns',
  'take', 'takes', 'give', 'gives', 'put', 'puts',
  'user', 'app', 'page', 'view', 'button', 'screen',
  'server', 'client', 'api', 'endpoint', 'route',
  'log', 'logs', 'test', 'tests', 'config', 'settings',
  'pipeline', 'process', 'step', 'steps', 'flow', 'workflow',
  'source', 'sources', 'fetch', 'fetches', 'fetched',
  'store', 'stores', 'stored', 'update', 'updates', 'updated',
  'add', 'adds', 'remove', 'removes', 'delete', 'deletes',
  'try', 'tries', 'tried', 'different', 'multiple', 'various', 'variety',
  'then', 'after', 'before', 'during', 'while',
  'good', 'bad', 'right', 'wrong',
]);

function extractSearchTerms(description) {
  // Pull meaningful terms from natural language.
  // Keep words 4+ chars that aren't stopwords — shorter words are almost always noise.
  // Exception: known technical terms (3-char) are kept via a small allowlist.
  const TECHNICAL_SHORT = new Set(['tts', 'pdf', 'api', 'sse', 'jwt', 'ios', 'css', 'llm', 'map', 'sql']);
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => !STOPWORDS.has(w) && (w.length >= 4 || TECHNICAL_SHORT.has(w)))
    .filter((w, i, arr) => arr.indexOf(w) === i); // deduplicate
}

function adaptiveSearch(terms, tsData, swiftData) {
  const allFiles = [
    ...tsData.clusters.flatMap(c => c.files).map(f => ({ ...f, language: 'typescript' })),
    ...swiftData.clusters.flatMap(c => c.files).map(f => ({ ...f, language: 'swift' })),
  ].filter(f => f.status !== 'deleted');

  // Score each file: how many search terms match its searchTerms?
  const scored = allFiles.map(f => {
    const haystack = f.searchTerms || (f.label + ' ' + f.rel).toLowerCase();
    const hits = terms.filter(t => haystack.includes(t));
    return { file: f, score: hits.length, hits };
  }).filter(s => s.score > 0);

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { matches: [], strategy: 'no matches' };

  // Adaptive threshold: take files that match at least half the top score,
  // with a minimum of 2 terms matching to filter noise.
  // Cap at 15 primary files to keep LLM context manageable.
  const topScore = scored[0].score;
  const threshold = Math.max(2, Math.ceil(topScore * 0.5));
  let matches = scored
    .filter(s => s.score >= threshold)
    .slice(0, 15)
    .map(s => s.file);

  // If threshold 2 is too strict (0 results), fall back to 1
  if (matches.length === 0) {
    matches = scored.slice(0, 10).map(s => s.file);
  }

  return {
    matches,
    strategy: `${terms.length} terms extracted, threshold ${threshold}/${topScore}, ${matches.length} files`,
    extractedTerms: terms,
  };
}

function traceFeature(description, tsData, swiftData) {
  const terms = extractSearchTerms(description);

  // Adaptive search: find files by scoring, not all-or-nothing
  const { matches: matchingFiles, strategy, extractedTerms } = adaptiveSearch(terms, tsData, swiftData);

  // Collect the full set of file paths we'll read
  const matchRels = new Set(matchingFiles.map(f => f.rel));

  // Expand to 1-hop dependencies: files that import or are imported by matches
  const allEdges = [...tsData.fileEdges, ...swiftData.fileEdges];
  const neighborRels = new Set();
  for (const e of allEdges) {
    if (matchRels.has(e.from) && !matchRels.has(e.to)) neighborRels.add(e.to);
    if (matchRels.has(e.to) && !matchRels.has(e.from)) neighborRels.add(e.from);
  }

  // Build the subgraph edges (only between matches + neighbors)
  const relevantRels = new Set([...matchRels, ...neighborRels]);
  const subgraphEdges = allEdges
    .filter(e => relevantRels.has(e.from) && relevantRels.has(e.to))
    .map(e => ({ from: e.from, to: e.to }));

  // Identify entry points: matched files that are imported by non-matched files
  // (they're the "top" of the call chain for this feature)
  const entryPoints = [];
  for (const f of matchingFiles) {
    const importedByExternal = allEdges.some(e => e.to === f.rel && !matchRels.has(e.from));
    const importedByMatch = allEdges.some(e => e.to === f.rel && matchRels.has(e.from));
    if (importedByExternal || !importedByMatch) {
      entryPoints.push(f.rel);
    }
  }

  // Read source code for matching files (full content)
  // For neighbor files, read only exports/function signatures to save context
  const files = [];
  for (const f of matchingFiles) {
    const fullPath = path.join(ROOT, f.rel);
    let source = '';
    try { source = fs.readFileSync(fullPath, 'utf-8'); } catch { /* deleted */ }
    files.push({
      path: f.rel,
      label: f.label,
      language: f.language,
      status: f.status,
      cluster: f.cluster,
      loc: f.loc,
      role: 'primary',  // this file matched the query
      source,
      ...(f.exportAnalysis ? { exportAnalysis: f.exportAnalysis } : {}),
      ...(f.defines ? { defines: f.defines } : {}),
    });
  }

  // For neighbors: include a summary (first 80 lines + exported function signatures)
  for (const rel of neighborRels) {
    const fullPath = path.join(ROOT, rel);
    let source = '';
    try {
      const full = fs.readFileSync(fullPath, 'utf-8');
      const lines = full.split('\n');
      // Extract export signatures only (keep file small)
      const exportLines = lines
        .map((line, i) => ({ line, num: i + 1 }))
        .filter(({ line }) =>
          /^export\s/.test(line) ||
          /^\s*(public|open|func|class|struct|enum|protocol)\s/.test(line)
        )
        .map(({ line, num }) => `${num}: ${line}`);
      source = `// ${rel} — showing export signatures only (${lines.length} lines total)\n` +
               exportLines.join('\n');
    } catch { /* deleted */ }

    // Find the node metadata
    const allNodes = [...tsData.clusters, ...swiftData.clusters].flatMap(c => c.files);
    const node = allNodes.find(n => n.rel === rel);

    files.push({
      path: rel,
      label: node?.label || path.basename(rel),
      language: rel.endsWith('.swift') ? 'swift' : 'typescript',
      status: node?.status || 'supporting',
      cluster: node?.clusterLabel || 'Unknown',
      loc: node?.loc || 0,
      role: 'neighbor',  // connected to a match but didn't match query directly
      source,
    });
  }

  return {
    description,
    searchTerms: extractedTerms,
    searchStrategy: strategy,
    matchCount: matchingFiles.length,
    neighborCount: neighborRels.size,
    entryPoints,
    files,
    dependencyGraph: {
      edges: subgraphEdges,
      summary: subgraphEdges.map(e => {
        const fromLabel = files.find(f => f.path === e.from)?.label || e.from;
        const toLabel = files.find(f => f.path === e.to)?.label || e.to;
        return `${fromLabel} → ${toLabel}`;
      }),
    },
    instructions: `The user provided this description of how they believe a feature works:\n\n"${description}"\n\nThe files below were identified as relevant by static analysis. Trace the actual code paths step by step. For each step, cite the file and line/function. Compare the actual behavior to the user's description. Flag:\n- Steps the user described that don't exist in the code\n- Steps in the code the user didn't mention\n- Steps that work differently than described\n- Wrong ordering or assumptions\n- Dead code, stale paths, or cleanup opportunities`,
  };
}

function main() {
  const args = process.argv.slice(2);
  const searchArg = args.findIndex(a => a === '--search');
  const traceArg = args.findIndex(a => a === '--trace');
  const jsonMode = args.includes('--json');

  console.error('🗺️  Analyzing codebase...');
  const { tsGraph, swiftGraph, tsData, swiftData, findings } = analyze();
  console.error(`   TS: ${tsGraph.nodes.length} files, ${tsGraph.edges.length} connections`);
  console.error(`   Swift: ${swiftGraph.nodes.length} files, ${swiftGraph.edges.length} connections`);
  console.error(`   ${findings.length} findings`);

  // --trace "natural language description of how the feature works"
  // Single argument — the tool extracts search terms and uses the whole
  // text as the intent description for the LLM to compare against.
  if (traceArg >= 0) {
    const description = args[traceArg + 1];
    if (!description) {
      console.error('Usage: --trace "describe how the feature is supposed to work"');
      console.error('Example: --trace "The image pipeline fetches from Unsplash, scores with Gemini, picks the best one"');
      process.exit(1);
    }
    const result = traceFeature(description, tsData, swiftData);
    console.error(`   Search terms: ${result.searchTerms.join(', ')}`);
    console.error(`   Strategy: ${result.searchStrategy}`);
    console.error(`   ${result.matchCount} primary files, ${result.neighborCount} neighbors`);
    console.error(`   Entry points: ${result.entryPoints.join(', ')}`);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // --search "query" → JSON output of matching files
  if (searchArg >= 0) {
    const query = args[searchArg + 1];
    if (!query) { console.error('Usage: --search "query"'); process.exit(1); }
    const results = searchFiles(query, tsData, swiftData);
    const total = results.typescript.length + results.swift.length;
    console.error(`   ${total} matches for "${query}"`);
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // --json → full analysis as JSON (for MCP tool)
  if (jsonMode) {
    console.log(JSON.stringify({
      branch: getBranchName(),
      typescript: tsData,
      swift: swiftData,
      findings,
    }, null, 2));
    return;
  }

  // Default: generate HTML
  const html = generateHTML(tsData, swiftData, findings);
  const outPath = path.join(ROOT, 'code-paths.html');
  fs.writeFileSync(outPath, html);
  console.error('✅ Written to', outPath);
  console.error('   Open in your browser to explore.');
}

main();
