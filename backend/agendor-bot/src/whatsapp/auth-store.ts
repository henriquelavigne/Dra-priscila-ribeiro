import { createClient } from "@supabase/supabase-js";
import { initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";
import type { AuthenticationState, SignalDataTypeMap } from "@whiskeysockets/baileys";
import { config } from "../config";
import { logger } from "../utils/logger";

const SESSION_ID = "baileys_auth";

function getSupabase() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios para persistência de sessão");
  }
  return createClient(config.supabaseUrl, config.supabaseServiceKey);
}

export async function useSupabaseAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const supabase = getSupabase();

  // Carrega credenciais do Supabase
  async function loadData(): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from("bot_sessions")
      .select("data")
      .eq("id", SESSION_ID)
      .single();

    if (error || !data) {
      logger.info("[Auth] Nenhuma sessão encontrada no Supabase, iniciando nova sessão");
      return {};
    }

    return data.data as Record<string, unknown>;
  }

  // Salva dados no Supabase
  async function saveData(payload: Record<string, unknown>): Promise<void> {
    const { error } = await supabase
      .from("bot_sessions")
      .upsert({
        id: SESSION_ID,
        data: payload,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      logger.error({ error }, "[Auth] Erro ao salvar sessão no Supabase");
      throw error;
    }
  }

  // Carrega sessão existente
  const stored = await loadData();

  // Inicializa creds — usa os salvos ou cria novos
  const creds: AuthenticationState["creds"] = stored.creds
    ? JSON.parse(JSON.stringify(stored.creds), BufferJSON.reviver)
    : initAuthCreds();

  // Keys store compatível com Baileys
  const keys: AuthenticationState["keys"] = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
      const storedKeys = (stored.keys as Record<string, Record<string, unknown>>) || {};
      const typeKeys = storedKeys[type as string] || {};
      const result: { [id: string]: SignalDataTypeMap[T] } = {};
      for (const id of ids) {
        const value = typeKeys[id];
        if (value) {
          result[id] = JSON.parse(JSON.stringify(value), BufferJSON.reviver) as SignalDataTypeMap[T];
        }
      }
      return result;
    },
    set: async (data: Record<string, Record<string, unknown>>) => {
      const storedKeys = (stored.keys as Record<string, Record<string, unknown>>) || {};
      for (const [type, typeData] of Object.entries(data)) {
        if (!storedKeys[type]) storedKeys[type] = {};
        for (const [id, value] of Object.entries(typeData)) {
          if (value) {
            storedKeys[type][id] = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
          } else {
            delete storedKeys[type][id];
          }
        }
      }
      stored.keys = storedKeys;
    },
  };

  const state: AuthenticationState = { creds, keys };

  const saveCreds = async (): Promise<void> => {
    stored.creds = JSON.parse(JSON.stringify(state.creds, BufferJSON.replacer));
    await saveData(stored);
    logger.info("[Auth] Sessão salva no Supabase");
  };

  return { state, saveCreds };
}
