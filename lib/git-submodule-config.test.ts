import { execFileSync } from 'node:child_process'
import { it, expect } from 'vitest'
it('provides URL metadata for every tracked submodule without fetching it', () => {
  const entries=execFileSync('git',['ls-files','--stage'],{encoding:'utf8'}).split('\n')
  const links=entries.filter(line=>line.startsWith('160000 ')).map(line=>line.split('\t')[1])
  const paths=execFileSync('git',['config','--file','.gitmodules','--get-regexp','^submodule\\..*\\.path$'],{encoding:'utf8'}).trim().split('\n')
  for(const link of links) {
    const entry=paths.find(line=>line.slice(line.indexOf(' ')+1)===link)
    expect(entry,`Missing submodule path ${link}`).toBeTruthy()
    const key=entry!.split(' ')[0].replace(/\.path$/,'.url')
    expect(execFileSync('git',['config','--file','.gitmodules','--get',key],{encoding:'utf8'}).trim()).toMatch(/^https:\/\/github\.com\//)
  }
  expect(()=>execFileSync('git',['submodule','foreach','--recursive','true'],{stdio:'pipe'})).not.toThrow()
})
