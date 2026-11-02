import { describe, expect, it } from 'vitest'
import { mapSearchHit } from './search-hit'

describe('editorial search metadata', () => {
  it('preserves the canonical Kubernetes asset and authored description', () => {
    expect(mapSearchHit({url:'/blog/kubernetes-cicd-part-2/', excerpt:'raw article', meta:{title:'Kubernetes', description:'  Deploy with confidence.  ', topicIcon:'/topics/kubernetes.png', topicLabel:'Kubernetes'}})).toMatchObject({title:'Kubernetes', description:'Deploy with confidence.', topicIcon:'/topics/kubernetes.png', topicMode:'image'})
  })
  it('keeps custom category vectors theme-aware', () => {
    expect(mapSearchHit({url:'/blog/physics/',excerpt:'',meta:{topicIcon:'/topics/custom-v6/physics.svg',topicMode:'mask'}})).toMatchObject({topicIcon:'/topics/custom-v6/physics.svg',topicMode:'mask'})
  })
  it.each(['https://example.com/icon.svg','/topics/../private.svg','/topics/icon.svg"),url(https://example.com/x)','/topics/icon.svg?remote=1'])('rejects non-canonical icon paths: %s', topicIcon => {
    expect(mapSearchHit({url:'/blog/post/',excerpt:'',meta:{topicIcon,topicMode:'mask'}}).topicIcon).toBeUndefined()
  })
  it('retains excerpt and heading fallbacks for older indexes', () => {
    expect(mapSearchHit({url:'/blog/old/',excerpt:'An <mark>indexed</mark> excerpt',sub_results:[{url:'/blog/old/#heading',excerpt:'',title:'Old heading'}],meta:{description:' '}})).toMatchObject({title:'Old heading',excerpt:'An <mark>indexed</mark> excerpt',description:undefined})
    expect(mapSearchHit({url:'/blog/untitled/',excerpt:''}).title).toBe('/blog/untitled/')
  })
})
