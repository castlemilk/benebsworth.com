import Cat from './images/cat.png';
import Dog from './images/dog.png';
import Lizard from './images/lizard.png';

export const blogs = [
    {
        title: 'the dog went shopping',
        description: 'one day a dog went to the shops to buy some biscuits',
        image: Dog,
        tags: [ 'dog', 'shopping', 'walking', 'buscuits'],
        link: 'dog-shopping',
        key: 1
    },
    {
        title: 'One day a cat ate a bird',
        description: 'birds eat cats, and cats eat birds. a short expose of the circle of life',
        image: Cat,
        tags: [ 'cats', 'birds', 'existentialism', 'eating'],
        link: 'cats-eating',
        key: 2
    },
    {
        title: 'lizards thoughts on warm blood',
        description: 'a lizard born with warm blood, the pros and cons',
        image: Lizard,
        tags: [ 'lizards', 'people', 'scales', 'hearts'],
        link: 'warm-blood',
        key: 3
    }
]