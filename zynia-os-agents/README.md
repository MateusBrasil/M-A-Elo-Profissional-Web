# Zynia OS Agents

Esta pasta foi gerada pelo `zynia-mcp export`.

Ela serve para visualizar, estudar e melhorar os agentes/squads da Zynia OS em formato local.

## Importante

- Estes arquivos sao uma materializacao editavel/documental.
- Editar estes arquivos nao altera automaticamente o backend da Zynia OS.
- O runtime real dos agentes continua no backend configurado.
- Use estes arquivos como biblioteca, briefing, base de melhoria e handoff.

## Backend

- URL: `http://localhost:3001`
- Gateway: `/api/mcp-gateway`

## Conteudo Gerado

- Agentes operacionais: 55
- Agentes na registry: 59
- Squads: 7
- Comandos vibe: 8

## Como Usar

```powershell
npx -y zynia-mcp doctor --url http://localhost:3001 --api-key SUA_CHAVE
npx -y zynia-mcp install --url http://localhost:3001 --api-key SUA_CHAVE
```

## Estrutura

- `agents/`: cards dos agentes operacionais.
- `registry/`: lista ampliada da registry.
- `squads/`: squads e times.
- `commands/`: comandos `/vibe-*`.
- `config/`: exemplo de config MCP.
