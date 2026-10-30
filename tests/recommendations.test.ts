import test from 'node:test';
import assert from 'node:assert/strict';
import {hasPizzaPreference,recommendWeeklyPizza} from '../apps/api/src/recommendations.ts';

test('weekly recommendation chooses a popular nearest neighbor from the three leaders',()=>{
 const sales=[{flavorId:'mussarela',quantity:12},{flavorId:'calabresa',quantity:10},{flavorId:'portuguesa',quantity:8},{flavorId:'frango_catupiry',quantity:2}];
 assert.equal(recommendWeeklyPizza(sales,'quero calabresa', 'pt-BR')?.flavorId,'calabresa');
 assert.equal(recommendWeeklyPizza(sales,'', 'en-US')?.flavorId,'mussarela');
 assert.equal(recommendWeeklyPizza(sales,'What pizza do you recommend?', 'en-US')?.flavorId,'mussarela');
 assert.equal(recommendWeeklyPizza(sales,'quero frango', 'pt-BR')?.flavorId,'mussarela');
 assert.equal(recommendWeeklyPizza(sales,'quero calabresa', 'pt-BR',new Set(['mussarela']))?.flavorId,'mussarela');
 assert.equal(recommendWeeklyPizza([], 'suggest something', 'en-US'),undefined);
});

test('recommendation intent recognizes pizza preferences and avoids unrelated questions',()=>{
 assert.equal(hasPizzaPreference('I want Calabresa with onion'),true);
 assert.equal(hasPizzaPreference('qual pizza você recomenda?'),true);
 assert.equal(hasPizzaPreference('What is your pickup policy?'),false);
});
