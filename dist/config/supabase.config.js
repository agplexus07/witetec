"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = 'https://xrdedelhrbiafnuwbnvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZGVkZWxocmJpYWZudXdibnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MDIzMjEsImV4cCI6MjA1NzM3ODMyMX0.76HqqHwf-ID0L5yY17tbgCBbtCqdrGSQuHrT3gGRP40';
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
//# sourceMappingURL=supabase.config.js.map