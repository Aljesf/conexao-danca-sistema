const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error('Missing env'); process.exit(1); }
const supabase = createClient(url, key);
(async () => {
  const { data, error } = await supabase.from('funcoes_colaborador').select('id,nome,grupo,ativo').order('id');
  if (error) { console.error(error); process.exit(1); }
  console.log(JSON.stringify(data, null, 2));
})();
